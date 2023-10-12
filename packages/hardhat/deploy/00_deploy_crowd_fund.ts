import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployCrowdFund: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const owner = "0x3c4F8cb2ea3FFfFD8f9a1BEF9119F3E12ACC95d0"; //todo change to fe wallet
  await deploy("CrowdFund", {
    from: deployer,
    args: [owner],
    log: true,
    autoMine: true,
  });
};

export default deployCrowdFund;
deployCrowdFund.tags = ["CrowdFund"];
