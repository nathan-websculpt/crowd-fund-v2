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
       }); 

       it("Should complete all donations to the (3-sig)", async function() {
        const [, , , , , , , , someoneElseEntirely] = await ethers.getSigners();
        const fundRunID = 2;     
        const donationAmount = parseEther("1");
        const tx = await crowdFund.connect(someoneElseEntirely).donateToFundRun(fundRunID, { value: donationAmount });
        await tx.wait();
        const multiSigFundRun = await crowdFund.getFundRun(fundRunID);
        console.log("\n\nTitle: ", multiSigFundRun.title, "\nDonations: ", multiSigFundRun.donations[0].toString(), "\nDonors: ", multiSigFundRun.donors);
       }); 
    });

    //todo: wait for FundRuns to end...
    //todo: test multisig/vault transactions 

    
    describe("Waiting for Fund Runs to end ... ", function () {
        it("...do some fancy multisig vault stuff", async function () {
          do {
            await setTimeout(5000); //wait 5 more seconds
          } while (aliceJohnsDeadline.toBigInt() > BigInt((await getBlock()).toString()));
          console.log("\n\nAlice/John's Fund Run is over -- deadline passed")
          
        });
        
        it("...do even more fancy multisig vault stuff", async function () {
            do {
                await setTimeout(5000); //wait 5 more seconds
            } while (chandlerJoeyRossDeadline.toBigInt() > BigInt((await getBlock()).toString()));
            console.log("\n\nChandler/Joey/Ross Fund Run is over -- deadline passed")
            
        });
    });
  
  });
});
