import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployCrowdFund: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const owner = "0xD0E334851a88De79ea32BDdc316c3d6c4Ab5d273"; //todo change to fe wallet
  await deploy("CrowdFund", {
    from: deployer,
    args: [owner],
    log: true,
    autoMine: true,
  });
};

export default deployCrowdFund;
deployCrowdFund.tags = ["CrowdFund"];
