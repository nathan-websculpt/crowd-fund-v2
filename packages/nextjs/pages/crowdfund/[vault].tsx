/* eslint-disable prettier/prettier */


// todo: 
// get nonce, 
// ethers.utils.defaultAbiCoder.encode(["tuple(uint256,address,address)"]
// ethers.utils.solidityPack(["bytes", "uint256"], [encoded, nonce]);
// const digest= ethers.utils.keccak256(encodedWithNonce);
// .signMessage(ethers.utils.arrayify(digest)
// await crowdFund.connect(signer).multisigWithdraw(tx, nonce, signatures, fundRunID);
//    ^^^^ NEED VIEM migration code ^^^



import { NextPage } from "next";
import { useRouter } from "next/router";
import { parseEther, encodeAbiParameters } from "viem";
import { useScaffoldContractWrite } from "~~/hooks/scaffold-eth";

const VaultPage: NextPage = () => {
    const router = useRouter();
    
    const { multisigVault } = router.query as { multisigVault?: `${string}` };
    const tx = {amount, to, proposedBy};

    const { writeAsync, isLoading } = useScaffoldContractWrite({
        contractName: "CrowdFund",
        functionName: "multisigWithdraw",
        args: [fundRunSingle?.id],
        onBlockConfirmation: txnReceipt => {
          console.log("📦 Transaction blockHash", txnReceipt.blockHash);
        },
        value: donationInput,
      });
  return (
  <>
            <button className="w-10/12 mx-auto md:w-3/5 btn btn-primary" onClick={() => writeAsync()}>
              TEST
            </button>
  </>
  );
};

export default VaultPage;