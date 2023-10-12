import { ethers } from "hardhat";
import { CrowdFund } from "../typechain-types";
import { formatEther, parseEther } from "ethers/lib/utils";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { setTimeout } from "timers/promises";
import hre from "hardhat";

describe("CrowdFund", function () {
  let crowdFund: CrowdFund;
  let numberOfFundRuns = 0;
  let totalContractBalance = parseEther("0");
  const bobsId = 0;
  const alicesId = 1;
  const johnsId = 2;
  let bobsDeadline = BigNumber.from("0");
  let alicesDeadline = BigNumber.from("0");
  let johnsDeadline = BigNumber.from("0");
  type ExpectedAmounts = {
    commission: BigNumber;
    lessCommission: BigNumber;
  };
  

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
  ) => {
    const tx = await crowdFund.connect(walletSigning).createFundRun(title, description, targetAmount, deadline);
    await expect(tx)
      .to.emit(crowdFund, "FundRunCreated")
      .withArgs(numberOfFundRuns, walletSigning.address, title, targetAmount)
      .then(() => {
        numberOfFundRuns++;
      });
  };

  //donates to a Fund Run
  const donateToFundRun = async (
    walletSigning: SignerWithAddress,
    fundRunOwnerAddress: SignerWithAddress,
    fundRunId: number,
    donationAmount: BigNumber,
    expectedAmount: BigNumber,
  ) => {
    console.log("\nwallet balance PRE-donation:  ", formatEther(await walletSigning.getBalance()));
    const tx = await crowdFund.connect(walletSigning).donateToFundRun(fundRunId, { value: donationAmount });
    await expect(tx)
      .to.emit(crowdFund, "DonationHappened")
      .withArgs(fundRunOwnerAddress.address, walletSigning.address, donationAmount); //owner, donor, amount
    console.log("wallet balance POST-donation: ", formatEther(await walletSigning.getBalance()));

    totalContractBalance = totalContractBalance.add(donationAmount);

    const contractBalance = await crowdFund.getBalance();
    expect(contractBalance).to.equal(totalContractBalance);

    const thisFundRun = await crowdFund.getFundRun(fundRunId);
    expect(thisFundRun.amountCollected).to.equal(expectedAmount);

    //Looks at the following arrays on the Fund Run struct: address[] donors; uint256[] donations;
    const donationsRaw = await crowdFund.getDonors(fundRunId);
    const donors = donationsRaw[0];
    const donations = donationsRaw[1];
    const thisDonor = donors[donors.length - 1]; //donationsRaw[0][LAST_ITEM]
    const thisDonation = donations[donations.length - 1]; //donationsRaw[1][0][LAST_ITEM]
    expect(thisDonor).to.equal(walletSigning.address);
    expect(thisDonation).to.equal(donationAmount);
  };

  const getExpectedAmts = (beforeContractCommission: number) => {
    const comm = (0.25 / 100) * beforeContractCommission; //0.25% 
    const lessCommission = beforeContractCommission - comm;
    const rslt: ExpectedAmounts = {
      commission: parseEther(comm.toString()),
      lessCommission: parseEther(lessCommission.toString())
    };
    return rslt;
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
      it("Should make 3 test Fund Runs", async function () {
        const [, bob, alice, john] = await ethers.getSigners();
        const deadlineToCreateWith = 1;

        await createFundRun(bob, "Bob's Fund Run", "Bob's Description", parseEther("1"), deadlineToCreateWith);
        await createFundRun(alice, "Alice's Fund Run", "Alice's Description", parseEther("2"), deadlineToCreateWith);
        await createFundRun(john, "John's Fund Run", "John's Description", parseEther("3"), deadlineToCreateWith);

        const bobsFundRun = await crowdFund.getFundRun(bobsId);
        const alicesFundRun = await crowdFund.getFundRun(alicesId);
        const johnsFundRun = await crowdFund.getFundRun(johnsId);

        bobsDeadline = bobsFundRun.deadline;
        alicesDeadline = alicesFundRun.deadline;
        johnsDeadline = johnsFundRun.deadline;

        const numOfFundRuns = await crowdFund.numberOfFundRuns();
        expect(numOfFundRuns).to.equal(3);
      });
    });

    describe("Testing the ability for users to donate ...", function () {
      it("Should allow Bob to donate to Alice", async function () {
        const amountToDonate = parseEther("1");
        const amountExpectedAfterDonation = parseEther("1");
        const [, bob, alice] = await ethers.getSigners();

        await donateToFundRun(bob, alice, alicesId, amountToDonate, amountExpectedAfterDonation);
      });

      it("Should allow John to donate to Alice", async function () {
        const amountToDonate = parseEther("1");
        const amountExpectedAfterDonation = parseEther("2");
        const [, , alice, john] = await ethers.getSigners();

        await donateToFundRun(john, alice, alicesId, amountToDonate, amountExpectedAfterDonation);
      });

      it("Should allow Bob to donate to John", async function () {
        const amountToDonate = parseEther("1");
        const amountExpectedAfterDonation = parseEther("1");
        const [, bob, , john] = await ethers.getSigners();

        await donateToFundRun(bob, john, johnsId, amountToDonate, amountExpectedAfterDonation);
      });

      it("Should allow Alice to donate to John", async function () {
        const amountToDonate = parseEther("1");
        const amountExpectedAfterDonation = parseEther("2");
        const [, , alice, john] = await ethers.getSigners();

        await donateToFundRun(alice, john, johnsId, amountToDonate, amountExpectedAfterDonation);
      });
    });

    describe("Waiting for Fund Runs to end ... ", function () {
      it("Should allow for Alice to do an 'Owner Withdrawal' because her Fund was successful", async function () {
        do {
          await setTimeout(5000); //wait 5 more seconds
        } while (alicesDeadline.toBigInt() > BigInt((await getBlock()).toString()));

        const [, , alice] = await ethers.getSigners();
        const expected = getExpectedAmts(2);
        const expectedAmount = expected.lessCommission;
        const expectedCommission = expected.commission;
        console.log("\nALICE'S wallet balance PRE-withdrawal:  ", formatEther(await alice.getBalance()));
        const tx = await crowdFund.connect(alice).fundRunOwnerWithdraw(alicesId);
        await expect(tx).to.emit(crowdFund, "OwnerWithdrawal").withArgs(alice.address, expectedAmount);
        console.log("ALICE'S wallet balance POST-withdrawal: ", formatEther(await alice.getBalance()));

        totalContractBalance = totalContractBalance.sub(expectedAmount);
        const contractBalance = await crowdFund.getBalance();
        expect(contractBalance).to.equal(totalContractBalance);

        const alicesFundRun = await crowdFund.getFundRun(alicesId);
        expect(alicesFundRun.amountCollected).to.equal(expectedAmount.add(expectedCommission));
        expect(alicesFundRun.amountWithdrawn).to.equal(expectedAmount);
      });

      it("Should allow for Bob to do a 'Donor Withdrawal' from John's Fund Run", async function () {
        do {
          await setTimeout(5000); //wait 5 more seconds
        } while (johnsDeadline.toBigInt() > BigInt((await getBlock()).toString()));

        const [, bob, , john] = await ethers.getSigners();
        console.log("\nBOB'S wallet balance PRE-withdrawal:  ", formatEther(await bob.getBalance()));
        const tx = await crowdFund.connect(bob).fundRunDonorWithdraw(johnsId);
        await expect(tx).to.emit(crowdFund, "DonorWithdrawal").withArgs(john.address, bob.address, parseEther("1"));
        console.log("BOB'S wallet balance POST-withdrawal: ", formatEther(await bob.getBalance()));

        totalContractBalance = totalContractBalance.sub(parseEther("1"));
        const contractBalance = await crowdFund.getBalance();
        expect(contractBalance).to.equal(totalContractBalance);

        const johnsFundRun = await crowdFund.getFundRun(johnsId);
        expect(johnsFundRun.amountCollected).to.equal(parseEther("2"));
        expect(johnsFundRun.amountWithdrawn).to.equal(parseEther("1"));
      });

      it("Should allow for Alice to do a 'Donor Withdrawal' from John's Fund Run", async function () {
        do {
          await setTimeout(5000); //wait 5 more seconds
        } while (johnsDeadline.toBigInt() > BigInt((await getBlock()).toString()));

        const [, , alice, john] = await ethers.getSigners();
        console.log("\nALICE'S wallet balance PRE-withdrawal:  ", formatEther(await alice.getBalance()));
        const tx = await crowdFund.connect(alice).fundRunDonorWithdraw(johnsId);
        await expect(tx).to.emit(crowdFund, "DonorWithdrawal").withArgs(john.address, alice.address, parseEther("1"));
        console.log("ALICE'S wallet balance POST-withdrawal: ", formatEther(await alice.getBalance()));

        totalContractBalance = totalContractBalance.sub(parseEther("1"));
        const contractBalance = await crowdFund.getBalance();
        expect(contractBalance).to.equal(totalContractBalance);

        const johnsFundRun = await crowdFund.getFundRun(johnsId);
        expect(johnsFundRun.amountCollected).to.equal(parseEther("2"));
        expect(johnsFundRun.amountWithdrawn).to.equal(parseEther("2"));
      });

      it("Should see that Bob's Fund Run has no donors/donations", async function () {
        do {
          await setTimeout(5000); //wait 5 more seconds
        } while (bobsDeadline.toBigInt() > BigInt((await getBlock()).toString()));

        const bobsFundRun = await crowdFund.getFundRun(bobsId);
        expect(bobsFundRun.amountCollected).to.equal(0);
        expect(bobsFundRun.donations).to.deep.equal([]);
        expect(bobsFundRun.donors).to.deep.equal([]);

        const contractBalance = await crowdFund.getBalance();
        console.log("__>>: total contract balance: ", formatEther(contractBalance));
      });
    });

    describe("Can Contract Owner withdraw ...", function () {
      it("Should allow contract owner to withdraw 0.005 ethers", async function () {
        const [owner] = await ethers.getSigners();
        console.log("\nCONTRACT OWNER wallet balance PRE-withdrawal:  ", formatEther(await owner.getBalance()));
        const tx = await crowdFund.connect(owner).contractOwnerWithdraw();
        await expect(tx).to.emit(crowdFund, "ContractOwnerWithdrawal").withArgs(owner.address, totalContractBalance);
        console.log("CONTRACT OWNER wallet balance POST-withdrawal:  ", formatEther(await owner.getBalance()));
      });
    });
  });
});
