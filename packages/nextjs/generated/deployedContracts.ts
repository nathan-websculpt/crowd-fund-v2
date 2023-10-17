const contracts = {
  31337: [
    {
      chainId: "31337",
      name: "localhost",
      contracts: {
        CrowdFund: {
          address: "0x9A676e781A523b5d0C0e43731313A708CB607508",
          abi: [
            {
              inputs: [
                {
                  internalType: "address",
                  name: "_contractOwner",
                  type: "address",
                },
              ],
              stateMutability: "nonpayable",
              type: "constructor",
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: false,
                  internalType: "address",
                  name: "contractOwner",
                  type: "address",
                },
                {
                  indexed: false,
                  internalType: "uint256",
                  name: "amount",
                  type: "uint256",
                },
              ],
              name: "ContractOwnerWithdrawal",
              type: "event",
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: false,
                  internalType: "address[]",
                  name: "owners",
                  type: "address[]",
                },
                {
                  indexed: false,
                  internalType: "address",
                  name: "donor",
                  type: "address",
                },
                {
                  indexed: false,
                  internalType: "uint256",
                  name: "amount",
                  type: "uint256",
                },
              ],
              name: "DonationHappened",
              type: "event",
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: false,
                  internalType: "address[]",
                  name: "owners",
                  type: "address[]",
                },
                {
                  indexed: false,
                  internalType: "address",
                  name: "donor",
                  type: "address",
                },
                {
                  indexed: false,
                  internalType: "uint256",
                  name: "amount",
                  type: "uint256",
                },
              ],
              name: "DonorWithdrawal",
              type: "event",
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: false,
                  internalType: "uint16",
                  name: "id",
                  type: "uint16",
                },
                {
                  indexed: false,
                  internalType: "address[]",
                  name: "owners",
                  type: "address[]",
                },
                {
                  indexed: false,
                  internalType: "string",
                  name: "title",
                  type: "string",
                },
                {
                  indexed: false,
                  internalType: "uint256",
                  name: "target",
                  type: "uint256",
                },
              ],
              name: "FundRunCreated",
              type: "event",
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: false,
                  internalType: "address[]",
                  name: "owners",
                  type: "address[]",
                },
                {
                  indexed: false,
                  internalType: "uint256",
                  name: "amount",
                  type: "uint256",
                },
              ],
              name: "OwnerWithdrawal",
              type: "event",
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: "address",
                  name: "previousOwner",
                  type: "address",
                },
                {
                  indexed: true,
                  internalType: "address",
                  name: "newOwner",
                  type: "address",
                },
              ],
              name: "OwnershipTransferred",
              type: "event",
            },
            {
              inputs: [],
              name: "contractOwnerWithdraw",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "string",
                  name: "_title",
                  type: "string",
                },
                {
                  internalType: "string",
                  name: "_description",
                  type: "string",
                },
                {
                  internalType: "uint256",
                  name: "_target",
                  type: "uint256",
                },
                {
                  internalType: "uint16",
                  name: "_deadline",
                  type: "uint16",
                },
                {
                  internalType: "address[]",
                  name: "_owners",
                  type: "address[]",
                },
              ],
              name: "createFundRun",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint16",
                  name: "_id",
                  type: "uint16",
                },
              ],
              name: "donateToFundRun",
              outputs: [],
              stateMutability: "payable",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "",
                  type: "address",
                },
              ],
              name: "donorLogs",
              outputs: [
                {
                  internalType: "address",
                  name: "donor",
                  type: "address",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint16",
                  name: "_id",
                  type: "uint16",
                },
              ],
              name: "fundRunDonorWithdraw",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint16",
                  name: "_id",
                  type: "uint16",
                },
              ],
              name: "fundRunOwnerWithdraw",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              name: "fundRunOwners",
              outputs: [
                {
                  internalType: "address",
                  name: "",
                  type: "address",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              name: "fundRuns",
              outputs: [
                {
                  internalType: "uint16",
                  name: "id",
                  type: "uint16",
                },
                {
                  internalType: "string",
                  name: "title",
                  type: "string",
                },
                {
                  internalType: "string",
                  name: "description",
                  type: "string",
                },
                {
                  internalType: "uint256",
                  name: "target",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "deadline",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "amountCollected",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "amountWithdrawn",
                  type: "uint256",
                },
                {
                  internalType: "bool",
                  name: "isActive",
                  type: "bool",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "getBalance",
              outputs: [
                {
                  internalType: "uint256",
                  name: "crowdFund_contractBalance",
                  type: "uint256",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint16",
                  name: "_id",
                  type: "uint16",
                },
              ],
              name: "getDonors",
              outputs: [
                {
                  internalType: "address[]",
                  name: "",
                  type: "address[]",
                },
                {
                  internalType: "uint256[]",
                  name: "",
                  type: "uint256[]",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint16",
                  name: "_id",
                  type: "uint16",
                },
              ],
              name: "getFundRun",
              outputs: [
                {
                  components: [
                    {
                      internalType: "uint16",
                      name: "id",
                      type: "uint16",
                    },
                    {
                      internalType: "address[]",
                      name: "owners",
                      type: "address[]",
                    },
                    {
                      internalType: "string",
                      name: "title",
                      type: "string",
                    },
                    {
                      internalType: "string",
                      name: "description",
                      type: "string",
                    },
                    {
                      internalType: "uint256",
                      name: "target",
                      type: "uint256",
                    },
                    {
                      internalType: "uint256",
                      name: "deadline",
                      type: "uint256",
                    },
                    {
                      internalType: "uint256",
                      name: "amountCollected",
                      type: "uint256",
                    },
                    {
                      internalType: "uint256",
                      name: "amountWithdrawn",
                      type: "uint256",
                    },
                    {
                      internalType: "address[]",
                      name: "donors",
                      type: "address[]",
                    },
                    {
                      internalType: "uint256[]",
                      name: "donations",
                      type: "uint256[]",
                    },
                    {
                      internalType: "bool",
                      name: "isActive",
                      type: "bool",
                    },
                  ],
                  internalType: "struct CrowdFund.FundRun",
                  name: "",
                  type: "tuple",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "getFundRuns",
              outputs: [
                {
                  components: [
                    {
                      internalType: "uint16",
                      name: "id",
                      type: "uint16",
                    },
                    {
                      internalType: "address[]",
                      name: "owners",
                      type: "address[]",
                    },
                    {
                      internalType: "string",
                      name: "title",
                      type: "string",
                    },
                    {
                      internalType: "string",
                      name: "description",
                      type: "string",
                    },
                    {
                      internalType: "uint256",
                      name: "target",
                      type: "uint256",
                    },
                    {
                      internalType: "uint256",
                      name: "deadline",
                      type: "uint256",
                    },
                    {
                      internalType: "uint256",
                      name: "amountCollected",
                      type: "uint256",
                    },
                    {
                      internalType: "uint256",
                      name: "amountWithdrawn",
                      type: "uint256",
                    },
                    {
                      internalType: "address[]",
                      name: "donors",
                      type: "address[]",
                    },
                    {
                      internalType: "uint256[]",
                      name: "donations",
                      type: "uint256[]",
                    },
                    {
                      internalType: "bool",
                      name: "isActive",
                      type: "bool",
                    },
                  ],
                  internalType: "struct CrowdFund.FundRun[]",
                  name: "",
                  type: "tuple[]",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint16",
                  name: "_id",
                  type: "uint16",
                },
              ],
              name: "getOwnersOfFundRun",
              outputs: [
                {
                  internalType: "address[]",
                  name: "",
                  type: "address[]",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "_addr",
                  type: "address",
                },
                {
                  internalType: "uint16",
                  name: "_id",
                  type: "uint16",
                },
              ],
              name: "isOwnerOfFundRun",
              outputs: [
                {
                  internalType: "bool",
                  name: "",
                  type: "bool",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "numberOfFundRuns",
              outputs: [
                {
                  internalType: "uint16",
                  name: "",
                  type: "uint16",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "owner",
              outputs: [
                {
                  internalType: "address",
                  name: "",
                  type: "address",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "renounceOwnership",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint16",
                  name: "_id",
                  type: "uint16",
                },
              ],
              name: "timeLeft",
              outputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "totalProfitsTaken",
              outputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "newOwner",
                  type: "address",
                },
              ],
              name: "transferOwnership",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
          ],
        },
      },
    },
  ],
} as const;

export default contracts;
