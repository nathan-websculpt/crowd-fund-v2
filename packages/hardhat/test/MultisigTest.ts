/* eslint-disable prettier/prettier */
//yarn test ./test/MultisigTest.ts
import { ethers } from "hardhat";
import { CrowdFund } from "../typechain-types";
import { formatEther, parseEther } from "ethers/lib/utils";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { setTimeout } from "timers/promises";
import hre from "hardhat";
import { Address } from "hardhat-deploy/types";

describe("Multisig Test", function () {
  this.timeout(125000); //2-minute timeout, Fund Runs have 1-minute deadlines
  let crowdFund: CrowdFund;
  let numberOfFundRuns = 0;
  let totalContractBalance = parseEther("0");
  let aliceJohnsDeadline = BigNumber.from("0");
  let chandlerJoeyRossDeadline = BigNumber.from("0");

  const getBlock = async (): Promise<number> => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    return latestBlock.timestamp;
  };

  const getNonce = async () => (await crowdFund.nonce()).add(1);

  const getDigest = async (
    nonce: BigNumber,
    amount: BigNumber,
    to: string,
    proposedBy: string
) => {
    const tx = {amount, to, proposedBy};
    const encoded = ethers.utils.defaultAbiCoder.encode(["tuple(uint256,address,address)"],  [[tx.amount, tx.to, tx.proposedBy]]);
    const encodedWithNonce = ethers.utils.solidityPack(["bytes", "uint256"], [encoded, nonce]);

    const digest= ethers.utils.keccak256(encodedWithNonce);
  return digest;
}
const signMultisigWithdraw = async (
    walletSigning: SignerWithAddress,
    nonce: BigNumber,
    amount: BigNumber,
    to: string,
    proposedBy: string,
    signatures: string[],
    fundRunID: number
) => {
    const tx = {amount, to, proposedBy};
    return await crowdFund.connect(walletSigning).multisigWithdraw(tx, nonce, signatures, fundRunID); 
}

  //creates a Fund Run as bob, alice, or john ... then checks the Event
  const createFundRun = async (
    walletSigning: SignerWithAddress,
    title: string,
    description: string,
    targetAmount: BigNumber,
    deadline: number,
    owners: string[],
  ) => {
    const tx = await crowdFund.connect(walletSigning).createFundRun(title, description, targetAmount, deadline, owners);
    await expect(tx)
      .to.emit(crowdFund, "FundRunCreated")
      .withArgs(numberOfFundRuns, owners, title, targetAmount)
      .then(() => {
        numberOfFundRuns++;
      });
  };

  describe("Deploying ...", function () {
    this.timeout(125000); //2-minute timeout, Fund Runs have 1-minute deadlines

    it("Should deploy CrowdFund", async function () {
      const [owner] = await ethers.getSigners();
      const crowdFundFactory = await ethers.getContractFactory("CrowdFund");
      crowdFund = (await crowdFundFactory.deploy(owner.address)) as CrowdFund;
      console.log("deployed CrowdFund at address: ", crowdFund.address);
    });

    it("Contract Owner transferred successfully upon deployment...", async function () {
      const [owner] = await ethers.getSigners();
      await expect(await crowdFund.owner()).to.equal(owner.address);
    });

    describe("Making test Fund Runs (this may take a moment) ...", function () {
      it("Should make a REGULAR Fund Run", async function () {
        const [, bob] = await ethers.getSigners();
        const deadlineToCreateWith = 1;
        await createFundRun(bob, "Bob's Fund Run", "Bob's Description", parseEther("1"), deadlineToCreateWith, [bob.address]);
        const bobsFundRun = await crowdFund.getFundRun(0);
        console.log("\n\nNew (REGULAR) Fund Run...\ntitle: ", bobsFundRun.title, "\nOwners: ", bobsFundRun.owners);
        expect(bobsFundRun.amountCollected).to.equal(0n);
      });

      it("Should make a (2-Sig) MULTISIG Fund Run", async function () {
        const [, , alice, john] = await ethers.getSigners();
        const deadlineToCreateWith = 1;
        const ownersArray = [alice.address, john.address];
        await createFundRun(
          alice,
          "Alice AND John's Fund Run",
          "2x MULTISIG FUNDRUN",
          parseEther("1"),
          deadlineToCreateWith,
          ownersArray,
        );

        const multiSigFundRun = await crowdFund.getFundRun(1);
        aliceJohnsDeadline = multiSigFundRun.deadline;
        console.log("\n\nNew (MULTISIG 2 tx) Fund Run...\ntitle: ", multiSigFundRun.title, "\nOwners: ", multiSigFundRun.owners);
        expect(multiSigFundRun.amountCollected).to.equal(0n);
      });

      it("Should make a (3-sig) MULTISIG Fund Run", async function () {
        const [, , , , chandler, joey, ross] = await ethers.getSigners();
        const deadlineToCreateWith = 1;
        const ownersArray = [chandler.address, joey.address, ross.address];
        await createFundRun(
          chandler,
          "Chandler/Joey/Ross Fund Run",
          "3x MULTISIG FUNDRUN",
          parseEther("1"),
          deadlineToCreateWith,
          ownersArray,
        );

        const multiSigFundRun = await crowdFund.getFundRun(2);
        chandlerJoeyRossDeadline = multiSigFundRun.deadline;
        console.log("\n\nNew (MULTISIG 3 tx) Fund Run...\ntitle: ", multiSigFundRun.title, "\nOwners: ", multiSigFundRun.owners);
        expect(multiSigFundRun.amountCollected).to.equal(0n);
      });
    });

    describe("Handling donations", function () {
       it("Should complete all donations to the (2-sig)", async function() {
        const [, , , , , , , someoneElse] = await ethers.getSigners();   
        const fundRunID = 1;     
        const donationAmount = parseEther("1");
        const tx = await crowdFund.connect(someoneElse).donateToFundRun(fundRunID, { value: donationAmount });
        await tx.wait();
        const multiSigFundRun = await crowdFund.getFundRun(fundRunID);
        console.log("\n\nTitle: ", multiSigFundRun.title, "\nDonations: ", multiSigFundRun.donations[0].toString(), "\nDonors: ", multiSigFundRun.donors);
        expect(multiSigFundRun.amountCollected).to.equal(donationAmount);
       }); 

       it("Should complete all donations to the (3-sig)", async function() {
        const [, , , , , , , , someoneElseEntirely] = await ethers.getSigners();
        const fundRunID = 2;     
        const donationAmount = parseEther("1");
        const tx = await crowdFund.connect(someoneElseEntirely).donateToFundRun(fundRunID, { value: donationAmount });
        await tx.wait();
        const multiSigFundRun = await crowdFund.getFundRun(fundRunID);
        console.log("\n\nTitle: ", multiSigFundRun.title, "\nDonations: ", multiSigFundRun.donations[0].toString(), "\nDonors: ", multiSigFundRun.donors);
        expect(multiSigFundRun.amountCollected).to.equal(donationAmount);
       }); 
    });
    
    
    
    describe("Waiting for Fund Runs to end ... ", function () {
        it("(2-sig wallet)...Alice proposes to pay John 0.25 Ethers", async function () {
          do {
            await setTimeout(5000); //wait 5 more seconds
          } while (aliceJohnsDeadline.toBigInt() > BigInt((await getBlock()).toString()));
          console.log("\n\nAlice/John's Fund Run is over -- deadline passed");

          const [, , alice, john] = await ethers.getSigners();
          const fundRunID = 1;     
          const transferAmount = parseEther("0.25");
          const johnFirstBalance = await john.getBalance();
          const johnExpectedBalance = await johnFirstBalance.add(transferAmount);
          console.log("Alice's Address: ", alice.address);
          console.log("John's Address: ", john.address);
          console.log("John has a balance of: ", formatEther(johnFirstBalance));


          const nonce = await getNonce();
          const digest = await getDigest(nonce, transferAmount, john.address, alice.address);
          const signatures = [];
          signatures.push(await alice.signMessage(ethers.utils.arrayify(digest)));
          signatures.push(await john.signMessage(ethers.utils.arrayify(digest)));
          console.log("signatures", signatures);
          const tx = await signMultisigWithdraw(john, nonce, transferAmount, john.address, alice.address, signatures, fundRunID);
          await tx.wait();
          const johnNewBalance = await john.getBalance();
          console.log("John NOW has a balance of: ", formatEther(johnNewBalance));
          expect(johnNewBalance).to.approximately(johnExpectedBalance, 10000000000000000n);
        });

        //paying someone who is not the owner IS allowed, because a group can pay tertiary parties (like designers, etc)
        it("(2-sig wallet)...John proposes to pay Bob (who is not an owner) 0.75 Ethers", async function () {  
            const [, bob, alice, john] = await ethers.getSigners();
            const fundRunID = 1;     
            const transferAmount = parseEther("0.75");
            const bobFirstBalance = await bob.getBalance();
            const bobExpectedBalance = await bobFirstBalance.add(transferAmount);
            console.log("Bob has a balance of: ", formatEther(bobFirstBalance));
  
  
            const nonce = await getNonce();
            const digest = await getDigest(nonce, transferAmount, bob.address, john.address);
            const signatures = [];
            signatures.push(await john.signMessage(ethers.utils.arrayify(digest)));
            signatures.push(await alice.signMessage(ethers.utils.arrayify(digest)));
            console.log("signatures", signatures);
            const tx = await signMultisigWithdraw(alice, nonce, transferAmount, bob.address, john.address, signatures, fundRunID);
            await tx.wait();
            const bobNewBalance = await bob.getBalance();
            console.log("Bob NOW has a balance of: ", formatEther(bobNewBalance));
            expect(bobNewBalance).to.approximately(bobExpectedBalance, 10000000000000000n);
          });


        it("(3-sig wallet)...The Chan-Chan Man proposes to pay Bob 0.5 Ethers", async function () {
            const [, bob, , , chandler, joey, ross] = await ethers.getSigners();

            const fundRunID = 2;
            const transferAmount = parseEther("0.5");

            const bobFirstBalance = await bob.getBalance();
            const bobExpectedBalance = await bobFirstBalance.add(transferAmount);
            console.log("Bob has a balance of: ", formatEther(bobFirstBalance));
            
            const nonce = await getNonce();
            const digest = await getDigest(nonce, transferAmount, bob.address, chandler.address);
            const signatures = [];
            signatures.push(await chandler.signMessage(ethers.utils.arrayify(digest)));
            signatures.push(await joey.signMessage(ethers.utils.arrayify(digest)));
            signatures.push(await ross.signMessage(ethers.utils.arrayify(digest)));
            console.log("signatures", signatures);
            const tx = await signMultisigWithdraw(ross, nonce, transferAmount, bob.address, chandler.address, signatures, fundRunID);
            await tx.wait();
            const bobNewBalance = await bob.getBalance();
            console.log("Bob NOW has a balance of: ", formatEther(bobNewBalance));
            expect(bobNewBalance).to.approximately(bobExpectedBalance, 10000000000000000n);

        });
        
        it("(3-sig wallet)...Ross proposes to pay Alice 0.5 Ethers", async function () {
            const [, , alice, , chandler, joey, ross] = await ethers.getSigners();

            const fundRunID = 2;
            const transferAmount = parseEther("0.5");

            const aliceFirstBalance = await alice.getBalance();
            const aliceExpectedBalance = await aliceFirstBalance.add(transferAmount);
            console.log("Alice has a balance of: ", formatEther(aliceFirstBalance));
            
            const nonce = await getNonce();
            const digest = await getDigest(nonce, transferAmount, alice.address, ross.address);
            const signatures = [];
            signatures.push(await ross.signMessage(ethers.utils.arrayify(digest)));
            signatures.push(await joey.signMessage(ethers.utils.arrayify(digest)));
            signatures.push(await chandler.signMessage(ethers.utils.arrayify(digest)));
            console.log("signatures", signatures);
            const tx = await signMultisigWithdraw(chandler, nonce, transferAmount, alice.address, ross.address, signatures, fundRunID);
            await tx.wait();
            const aliceNewBalance = await alice.getBalance();
            console.log("Alice NOW has a balance of: ", formatEther(aliceNewBalance));
            expect(aliceNewBalance).to.approximately(aliceExpectedBalance, 10000000000000000n);

        });
    });
  
  });
});
