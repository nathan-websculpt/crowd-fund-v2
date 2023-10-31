/* eslint-disable prettier/prettier */
import { useState } from "react";
import { BigNumber } from "ethers";
import { arrayify, defaultAbiCoder, keccak256, parseEther, solidityPack } from "ethers/lib/utils";
import { SignMessageReturnType } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import { useScaffoldContractRead, useScaffoldContractWrite, useScaffoldEventSubscriber } from "~~/hooks/scaffold-eth";

interface CreateProposalProps {
  id: number;
}

export const CreateProposal = (proposal: CreateProposalProps) => {
  const userAddress = useAccount();
  const [transferInput, setTransferInput] = useState("0.1");
  const [toAddressInput, setToAddressInput] = useState("0x091897BC27A6D6b1aC216b0B0059C0Fa4ECF5298");
  const [creationSignature, setCreationSignature] = useState<SignMessageReturnType>();

  const { data: walletClient } = useWalletClient();

  useScaffoldEventSubscriber({
    contractName: "CrowdFund",
    eventName: "ProposalCreated",
    listener: logs => {
      logs.map(log => {
        const { proposedBy, fundRunId, proposalId } = log.args;
        console.log(
          "📡 New Proposal Creation Event \nProposed By:",
          proposedBy,
          "Fund Run Id: ",
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
  const getNewNonce = () => {
    return fundRunNonce !== undefined ? fundRunNonce + 1n : 0n;
  }; //todo: refactor
  const getDigest = async (nonce: bigint, amount: BigNumber, to: string, proposedBy: string, reason: string) => {
    const tx = { amount, to, proposedBy, reason };

    console.log("getDigest amount: ", amount.toString());
    console.log("getDigest to: ", to);
    console.log("getDigest proposedBy: ", proposedBy);
    console.log("getDigest reason: ", reason);

    
    const encoded = defaultAbiCoder.encode(
      ["tuple(uint256,address,address,string)"],
      [[tx.amount, tx.to, tx.proposedBy, tx.reason]],
    );
    const encodedWithNonce = solidityPack(["bytes", "uint256"], [encoded, nonce]);

    const digest = keccak256(encodedWithNonce);
    return digest;
  }; //todo: refactor A:1

  const createProposal = async () => {
    const nonce = getNewNonce();
    const digest = await getDigest(
      nonce,
      parseEther(transferInput),
      toAddressInput,
      userAddress.address,
      "test proposal",
    );
    
    console.log("digest", digest);
    console.log("digest, made w/ wallet client", walletClient?.account);
    console.log("digest, made w/ user addr: ", userAddress.address);
    console.log("digest, made w/ to addr: ", toAddressInput);
    console.log("digest, made w/ amt: ", parseEther(transferInput).toString());

    
    const proposalCreationSig: any = await walletClient?.signMessage({
      account: walletClient.account,
      message: { raw: arrayify(digest) },
    });
    console.log(proposalCreationSig);

    setCreationSignature(proposalCreationSig);
    // writeAsync();
  };
  const { writeAsync, isLoading } = useScaffoldContractWrite({
    contractName: "CrowdFund",
    functionName: "createMultisigProposal",
    args: [creationSignature, proposal?.id],
    onBlockConfirmation: txnReceipt => {
      console.log("📦 Transaction blockHash", txnReceipt.blockHash);
    },
  });
  const testtest = () => {
    console.log("fund run id: ", proposal?.id);
    console.log("using signature: ", creationSignature);
    writeAsync();
  };

  return (
    <>
      <div className="mb-12">
        <h1>CREATE A PROPOSAL (CreateProposal.tsx)</h1>
        <label className="mt-3 text-lg font-bold">To Address</label>
        <input
          type="text"
          placeholder="To Address"
          className="px-3 py-3 border rounded-lg bg-base-200 border-base-300"
          value={toAddressInput}
          onChange={e => setToAddressInput(e.target.value)}
        />{" "}
        <div className="mt-4 tooltip tooltip-primary" data-tip="Transfer amount in Ether ... like '0.1' or '1'">
          <input
            type="number"
            placeholder="Transfer Amount"
            className="max-w-xs input input-bordered input-accent"
            onChange={e => setTransferInput(e.target.value)}
          />
        </div>
        <button className="w-10/12 mx-auto mt-5 md:w-3/5 btn btn-primary" onClick={() => createProposal()}>
          {/* Create a Proposal */}
          First Click
        </button>
        <button className="w-10/12 mx-auto md:w-3/5 btn btn-primary mt-9" onClick={() => testtest()}>
          Second Click
        </button>
      </div>
    </>
  );
};
