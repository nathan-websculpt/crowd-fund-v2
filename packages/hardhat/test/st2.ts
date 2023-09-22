//yarn test ./test/st.ts
import { ethers } from "hardhat";
import { CrowdFund } from "../typechain-types";
import { formatEther, parseEther } from "ethers/lib/utils";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { setTimeout } from "timers/promises";
import hre from "hardhat";

describe("Simple Test", function () {
  this.timeout(125000); //2-minute timeout, Fund Runs have 1-minute deadlines
  console.log("runs simple test one");
  let crowdFund: CrowdFund;
  let numberOfFundRuns = 0;

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

  it("Should deploy CrowdFund", async function () {
    const crowdFundFactory = await ethers.getContractFactory("CrowdFund");
    crowdFund = (await crowdFundFactory.deploy()) as CrowdFund;
    console.log("deployed CrowdFund at address: ", crowdFund.address);
  });

  describe("Making test Fund Runs (this may take a moment) ...", function () {
    it("Should make 1 test Fund Run", async function () {
      const [, bob] = await ethers.getSigners();
      const deadlineToCreateWith = 1;

      await createFundRun(bob, "Bob's Fund Run", "Bob's Description", parseEther("1"), deadlineToCreateWith);

      const bobsFundRun = await crowdFund.getFundRun(0);

      try {
        const halp = await crowdFund.connect(bob).donateToFundRun(0, { value: parseEther("1") }); //should fail
        expect(halp.wait()).to.throw();
      } catch (e: any) {
        console.log("✅ Bob is prevented from donating to his own Fund Run");
      }
    });
  });
});
