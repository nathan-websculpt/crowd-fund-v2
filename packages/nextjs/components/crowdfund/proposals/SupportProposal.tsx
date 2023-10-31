/* eslint-disable prettier/prettier */
import { useState } from "react";
import { BigNumber } from "ethers";
import { arrayify, defaultAbiCoder, keccak256, parseEther, solidityPack } from "ethers/lib/utils";
import { SignMessageReturnType } from "viem";
import { useWalletClient } from "wagmi";
import { useScaffoldContractRead, useScaffoldContractWrite, useScaffoldEventSubscriber } from "~~/hooks/scaffold-eth";

interface SupportProposalProps {
    id: number; //fundrun
    proposalId: number; //not needed?
}

export const SupportProposal = (proposal: SupportProposalProps) => {
    const [transferInput, setTransferInput] = useState("0.1");
    const [toAddressInput, setToAddressInput] = useState("0x091897BC27A6D6b1aC216b0B0059C0Fa4ECF5298");
    const [proposedByAddressInput, setProposedByAddressInput] = useState("0x1e714A71223529199167c1f26662f456ac1f7FBc");
    const [supportSignature, setSupportSignature] = useState<SignMessageReturnType>();
    const [proposalIdInput, setProposalIdInput] = useState<number>();

    const { data: walletClient } = useWalletClient();
    
  useScaffoldEventSubscriber({
    contractName: "CrowdFund",
    eventName: "ProposalSupported",
    listener: logs => {
      logs.map(log => {
        const { supportedBy, fundRunId, proposalId } = log.args;
        console.log(
          "📡 New Proposal Supported Event \nSupported By:",
          supportedBy,
          "\Fund Run Id: ",
          fundRunId,
          "\nProposal Id: ",
          proposalId,
        );
      });
    },
  });

  


  
  //todo: refactor A:1
const { data: fundRunNonce } = useScaffoldContractRead({
contractName: "CrowdFund",
functionName: "getNonce",
});
  const getNewNonce = () => {return fundRunNonce !== undefined ? fundRunNonce + 1n : 0n}; //todo: refactor
  const getDigest = async (
    nonce: bigint,
    amount: BigNumber,
    to: string,
    proposedBy: string,
    reason: string
) => {
    const tx = {amount, to, proposedBy, reason};
    const encoded = defaultAbiCoder.encode(["tuple(uint256,address,address,string)"],  [[tx.amount, tx.to, tx.proposedBy, tx.reason]]);

    

    console.log("getDigest amount: ", tx.amount.toString());
    console.log("getDigest to: ", tx.to);
    console.log("getDigest proposedBy: ", tx.proposedBy);
    console.log("getDigest reason: ", tx.reason);

    const encodedWithNonce = solidityPack(["bytes", "uint256"], [encoded, nonce]);

    const digest= keccak256(encodedWithNonce);
    return digest;
}//todo: refactor A:1




  const supportProposal = async () => {
    const nonce = getNewNonce();          //TODO: get from the proposal and To Address
    const digest = await getDigest(nonce, parseEther(transferInput), toAddressInput, proposedByAddressInput, "test proposal");

    
    console.log("nonce: ", nonce);
    console.log("digest", digest);
    console.log("wallet client", walletClient?.account);
    console.log("digest, made w/ wallet client", walletClient?.account);

    
    const proposalSupportSig:any = 
      await walletClient?.signMessage(
        {
          account: walletClient.account, 
          message: {raw: arrayify(digest)}
        });
    console.log(proposalSupportSig);
    
    setSupportSignature(proposalSupportSig);

  };
  const {writeAsync, isLoading} = useScaffoldContractWrite({
    contractName: "CrowdFund",
    functionName: "supportMultisigProposal",
    args: [supportSignature, proposal?.id, proposal?.proposalId],
    onBlockConfirmation: txnReceipt => {
      console.log("📦 Transaction blockHash", txnReceipt.blockHash);
    },
  });
  
  return (
    <>
    <div className="mt-12">
        <h1>SUPPORT A PROPOSAL (SupportProposal.tsx)</h1>

        <label className="mt-3 text-lg font-bold">Proposal Id</label>
                <input
                    type="number"
                    placeholder="Proposal ID"
                    className="px-3 py-3 border rounded-lg bg-base-200 border-base-300"
                    value={proposalIdInput}
                    onChange={e => setProposalIdInput(parseInt(e.target.value))}
                />{" "}

        <button className="w-10/12 mx-auto mt-5 md:w-3/5 btn btn-primary" onClick={() => supportProposal()}>
        {/* Create a Proposal */}
        First Click
        </button>
        <button className="w-10/12 mx-auto md:w-3/5 btn btn-primary mt-9" onClick={() => writeAsync()}>
        Second Click
        </button> 
    </div>
    </>
  )
}