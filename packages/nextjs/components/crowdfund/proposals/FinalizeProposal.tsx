/* eslint-disable prettier/prettier */
import { useState } from "react";
import { useScaffoldContractRead, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";

interface FinalizeProposalProps {
  id: number; //fundrun
  proposalId: number; //not needed?
}

export const FinalizeProposal = (proposal: FinalizeProposalProps) => {
  const [transferInput, setTransferInput] = useState<bigint>(BigInt(100000000000000000));
  const [toAddressInput, setToAddressInput] = useState("0x091897BC27A6D6b1aC216b0B0059C0Fa4ECF5298");
  const [proposedByInput, setProposedByInput] = useState("0x1e714A71223529199167c1f26662f456ac1f7FBc");
  const [reasonInput, setReasonInput] = useState("test proposal");
  const [proposalIdInput, setProposalIdInput] = useState<number>();
  const [nonceInput, setNonceInput] = useState<bigint>();

  const tx = { amount: transferInput, to: toAddressInput, proposedBy: proposedByInput, reason: reasonInput };
  //todo: refactor A:1
  const { data: fundRunNonce } = useScaffoldContractRead({
    contractName: "CrowdFund",
    functionName: "getNonce",
  });
  const getNewNonce = () => {
    return fundRunNonce !== undefined ? fundRunNonce + 1n : 0n;
  };

  const finishProposal = () => {
    const nonce = getNewNonce();
    setNonceInput(nonce);
    console.log("nonce: ", nonce);
    console.log("fund run id: ", proposal.id);
    console.log("proposal id: ", proposalIdInput);
    console.log("amount: ", transferInput.toString());
    console.log("to: ", toAddressInput);
    console.log("proposedBy: ", proposedByInput);
    console.log("reason: ", reasonInput);
  };

  const { writeAsync, isLoading } = useScaffoldContractWrite({
    contractName: "CrowdFund",
    functionName: "multisigWithdraw",
    args: [tx, nonceInput, proposal.id, proposalIdInput],
    onBlockConfirmation: txnReceipt => {
      console.log("📦 Transaction blockHash", txnReceipt.blockHash);
    },
  });

  return (
    <>
      <div className="mt-12">
        <h1>Finalize A PROPOSAL (FinalizeProposal.tsx)</h1>
        <label className="mt-3 text-lg font-bold">Proposal Id</label>
        <input
          type="number"
          placeholder="Proposal ID"
          className="px-3 py-3 border rounded-lg bg-base-200 border-base-300"
          value={proposalIdInput}
          onChange={e => setProposalIdInput(parseInt(e.target.value))}
        />{" "}
        <button className="w-10/12 mx-auto md:w-3/5 btn btn-primary mt-9" onClick={() => finishProposal()}>
          First Click
        </button>
        <button className="w-10/12 mx-auto md:w-3/5 btn btn-primary mt-9" onClick={() => writeAsync()}>
          Second Click
        </button>
      </div>
    </>
  );
};
