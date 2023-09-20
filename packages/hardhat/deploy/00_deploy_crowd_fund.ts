import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployCrowdFund: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  await deploy("CrowdFund", {
    from: deployer,
    log: true,
    autoMine: true,
  });
};

export default deployCrowdFund;
deployCrowdFund.tags = ["CrowdFund"];
