import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployCrowdFund: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const owner = "0x1e7aAbB9D0C701208E875131d0A1cFcDAba79350";
  await deploy("CrowdFund", {
    from: deployer,
    args: [owner],
    log: true,
    autoMine: true,
  });
};

export default deployCrowdFund;
deployCrowdFund.tags = ["CrowdFund"];
