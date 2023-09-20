import Link from "next/link";
import { Spinner } from "../Spinner";
import { FundRun } from "./FundRun";
import { useScaffoldContractRead } from "~~/hooks/scaffold-eth";

export const FundRunsList = () => {
  const { data: fundRuns, isLoading: isListLoading } = useScaffoldContractRead({
    contractName: "CrowdFund",
    functionName: "getFundRuns",
  });

  if (isListLoading) {
    return (
      <div className="flex flex-col gap-2 p-2 m-4 mx-auto border shadow-xl border-base-300 bg-base-200 sm:rounded-lg">
        <Spinner width="150px" height="150px" />
      </div>
    );
  } else {
    return (
      <>
        {fundRuns?.map(fund => (
          <div
            key={fund.id.toString()}
            className="flex flex-col gap-2 p-2 m-4 border shadow-xl border-base-300 bg-base-200 sm:rounded-lg"
          >
            <FundRun
              title={fund.title}
              description={fund.description}
              target={fund.target}
              deadline={fund.deadline.toString()}
              amountCollected={fund.amountCollected}
              amountWithdrawn={fund.amountWithdrawn}
              isActive={fund.isActive}
            />

            <div className="justify-end card-actions">
              <Link href={`/crowdfund/${fund.id}`} passHref className="link">
                <div className="tooltip tooltip-primary" data-tip="donate...">
                  <button className="btn btn-primary">View Fund Run</button>
                </div>
              </Link>
            </div>
          </div>
        ))}
      </>
    );
  }
};
