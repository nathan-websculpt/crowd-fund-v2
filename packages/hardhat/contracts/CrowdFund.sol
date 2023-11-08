//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";
import "../node_modules/@openzeppelin/contracts/security/ReentrancyGuard.sol";
import { ECDSA } from "../node_modules/@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @dev NOT PRODUCTION-READY ... FOR LEARNING PURPOSES ONLY
 * In progress, may break, check out V1 instead: https://github.com/nathan-websculpt/crowd-fund
 * CrowdFund.sol is a POC Multisig "Crowd Fund Creator"
 * known issues/enhancements saved for V2 --
 * - Fund Runs that receive 0 donations will never be de-activated
 * - FundRun struct has some bloat, but these values are handy for testing
 * - want an Enum to handle the state a FundRun is in
 * - V2 needs CrowdFund.sol to be ownable, with:
 * 		- contract profit-taking (probably 0.25% of each Donation or each Owner Withdrawal)
 * 		- only owner(s) can take profit
 * 		- only owner(s) can clean up de-activated/emptied Fund Runs ... or at least move them into an Archived state
 * 		- multisig functionality (thinking multisig Fund Runs is a cool end-goal for this project)
 */
contract CrowdFund is Ownable, ReentrancyGuard {
	struct FundRun {
		uint16 id; //not large enough in a prod scenario
		address[] owners;
		string title;
		string description;
		uint256 target;
		uint256 deadline;
		uint256 amountCollected;
		uint256 amountWithdrawn;
		address[] donors;
		uint256[] donations;
		bool isActive;
	}

	/**
	 * @dev an address _> has a DonorsLog
	 * a Donor Log _> has a mapping of
	 * FundRunId => donationAmount
	 */
	struct DonorsLog {
		address donor;
		mapping(uint256 => uint256) donorMoneyLog; //mapping(fundRunId => donationAmount)
	}

	struct MultiSigRequest {
		uint256 amount;
		address to;
		address proposedBy;
		string reason;
	}

	struct MultiSigVault {
		uint16 proposalId;
		uint256 amount;
		address to;
		address proposedBy;
		string reason;
		ProposalStatus status;
	}

	enum ProposalStatus {
		Created,
		Supported,
		TxSent
	}

	//      fr_Id
	mapping(uint16 => MultiSigVault[]) public vaults; //Fund Run's proposals
	//      proposalId...
	mapping(uint16 => bytes[]) public signatureList;
	mapping(uint256 => FundRun) public fundRuns;
	mapping(address => DonorsLog) public donorLogs; //a single donor will have all of their logs (across all Fund Runs they donated to) here

	uint16 public numberOfFundRuns = 0;
	uint16 public numberOfMultisigProposals = 0;
	uint256 public totalProfitsTaken = 0;
	uint256 public nonce;
	address[] public fundRunOwners;

	uint16 private constant crowdFundCommission = 25; //.25%
	uint16 private constant crowdFundDenominator = 10000;
	uint256 private commissionPayout = 0;

	/**
	 * @dev  This ensures that the signature cannot be used for purposes outside of Ethereum:
	 * https://medium.com/mycrypto/the-magic-of-digital-signatures-on-ethereum-98fe184dc9c7
	 * The signature can be notated as {r, s, v}
	 * 32 bytes for r (integar)
	 * 32 bytes for s (integar)
	 * 1  byte  for v (ethereum-specific recover identifier)
	 */
	string private constant MSG_PREFIX = "\x19Ethereum Signed Message:\n32";

	event FundRunCreated(
		uint16 id,
		address[] owners,
		string title,
		uint256 target
	);

	event DonationOccurred(address[] owners, address donor, uint256 amount);

	event FundRunOwnerWithdrawal(address[] owners, uint256 amount);

	event DonorWithdrawal(address[] owners, address donor, uint256 amount);

	event ContractOwnerWithdrawal(address contractOwner, uint256 amount);

	event ProposalCreated(
		address proposedBy,
		uint16 fundRunId,
		uint16 proposalId
	);

	event ProposalSupported(
		address supportedBy,
		uint16 fundRunId,
		uint16 proposalId
	);

	event ProposalRevoked(
		uint16 fundRunId,
		uint16 proposalId,
		address to,
		string reason
	);

	event MultisigTransferCompleted(
		uint16 fundRunId,
		uint16 proposalId,
		address to,
		uint256 amount
	);

	modifier ownsThisFundRun(
		uint16 id,
		address sender,
		bool senderOwnsThisFundRun
	) {
		FundRun storage fundRun = fundRuns[id];
		if (senderOwnsThisFundRun) {
			require(
				isOwnerOfFundRun(sender, id),
				"You are not the owner of this Fund Run."
			);
		} else {
			require(
				!isOwnerOfFundRun(sender, id),
				"You own this Fund Run -- therefore, this operation is not allowed"
			);
		}
		_;
	}

	modifier fundRunCompleted(uint16 id, bool fundRunHasCompleted) {
		FundRun storage fundRun = fundRuns[id];
		if (fundRunHasCompleted) {
			require(
				fundRun.deadline < block.timestamp,
				"This Fund Run is not complete."
			);
		} else {
			require(
				fundRun.deadline > block.timestamp,
				"This Fund Run has already completed."
			);
		}
		_;
	}

	modifier fundRunSucceeded(uint16 id, bool fundRunHasSucceeded) {
		FundRun storage fundRun = fundRuns[id];
		if (fundRunHasSucceeded) {
			require(
				fundRun.amountCollected >= fundRun.target,
				"This Fund Run has not yet met its monetary goal."
			);
		} else {
			require(
				fundRun.amountCollected < fundRun.target,
				"This Fund Run has already met its monetary goal."
			);
		}
		_;
	}

	modifier isMultisig(uint16 id, bool mustBeMultisig) {
		FundRun storage fundRun = fundRuns[id];
		if (mustBeMultisig) {
			require(
				fundRun.owners.length > 1,
				"This is NOT a multisig Fund Run - Operation not allowed."
			);
		} else {
			require(
				fundRun.owners.length == 1,
				"This IS a multisig Fund Run - Operation not allowed."
			);
		}
		_;
	}

	modifier createdProposal(
		uint16 _proposalId,
		uint16 _fundRunId,
		address signer,
		bool mustBeProposer
	) {
		MultiSigVault[] storage vaultsList = vaults[_fundRunId];
		for (uint16 i = 0; i < vaultsList.length; i++) {
			if (vaultsList[i].proposalId == _proposalId) {
				if (mustBeProposer) {
					require(
						vaultsList[i].proposedBy == signer,
						"The address is NOT the creator of this proposal -- action not allowed."
					);
					_;
				} else {
					require(
						vaultsList[i].proposedBy != signer,
						"The address is the creator of this proposal -- creators of proposals can not support them -- action not allowed."
					);
					_;
				}
			}
		}
	}

	constructor(address _contractOwner) {
		_transferOwnership(_contractOwner);
	}

	function createMultisigProposal(
		bytes calldata _signature,
		uint16 _fundRunId,
		MultiSigRequest calldata _tx
	)
		external
		isMultisig(_fundRunId, true)
		ownsThisFundRun(_fundRunId, msg.sender, true)
		fundRunCompleted(_fundRunId, true)
		fundRunSucceeded(_fundRunId, true)
	{
		FundRun storage fundRun = fundRuns[_fundRunId];
		require(fundRun.amountCollected > 0, "There is nothing to withdraw");
		require(
			fundRun.amountCollected > fundRun.amountWithdrawn,
			"This Fund Run is empty -- withdrawals may have already occurred."
		);
		require(
			_tx.amount > 0,
			"The proposed transaction withdrawal amount must be greater than 0."
		);
		require(
			fundRun.amountWithdrawn + _tx.amount <= fundRun.amountCollected,
			"This proposal would overdraw this Fund Run."
		);

		signatureList[numberOfMultisigProposals].push(_signature);

		//to see details of proposal in frontend
		MultiSigVault memory vault = MultiSigVault({
			proposalId: numberOfMultisigProposals,
			amount: _tx.amount,
			to: _tx.to,
			proposedBy: _tx.proposedBy,
			reason: _tx.reason,
			status: ProposalStatus(0)
		});
		vaults[_fundRunId].push(vault);

		numberOfMultisigProposals++;
		emit ProposalCreated(msg.sender, _fundRunId, vault.proposalId);
	}

	function supportMultisigProposal(
		bytes calldata _signature,
		uint16 _fundRunId,
		uint16 _proposalId
	)
		external
		isMultisig(_fundRunId, true)
		ownsThisFundRun(_fundRunId, msg.sender, true)
		createdProposal(_proposalId, _fundRunId, msg.sender, false)
	{
		changeProposalStatus(_fundRunId, _proposalId, 1);
		signatureList[_proposalId].push(_signature);
		emit ProposalSupported(msg.sender, _fundRunId, _proposalId);
	}

	//final transfer/call (when all signers are thought to have signed)
	function multisigWithdraw(
		MultiSigRequest calldata _tx,
		uint256 _nonce,
		uint16 _fundRunId,
		uint16 _proposalId
	)
		external
		nonReentrant
		isMultisig(_fundRunId, true)
		ownsThisFundRun(_fundRunId, msg.sender, true)
	{
		_verifyMultisigRequest(
			_tx,
			_nonce,
			signatureList[_proposalId],
			_fundRunId
		);
		_multisigTransfer(_tx, _fundRunId, _proposalId);
	}

	/**
	 * @dev  Only the user who created a proposal can revoke it
	 */
	function revokeMultisigProposal(
		uint16 _fundRunId,
		uint16 _proposalId
	)
		external
		isMultisig(_fundRunId, true)
		ownsThisFundRun(_fundRunId, msg.sender, true)
		createdProposal(_proposalId, _fundRunId, msg.sender, true)
	{
		MultiSigVault[] storage vaultsList = vaults[_fundRunId];
		for (uint16 i = 0; i < vaultsList.length; i++) {
			if (vaultsList[i].proposalId == _proposalId) {
				emit ProposalRevoked(
					_fundRunId,
					_proposalId,
					vaults[_fundRunId][i].to,
					vaults[_fundRunId][i].reason
				);
				delete vaults[_fundRunId][i];
				break;
			}
		}
	}

	function createFundRun(
		string memory _title,
		string memory _description,
		uint256 _target,
		uint16 _deadline,
		address[] memory _owners
	) public {
		uint256 fundRunDeadline = block.timestamp + _deadline * 60;
		require(
			fundRunDeadline > block.timestamp,
			"The deadline would ideally be a date in the future there, Time Traveler."
		);
		bytes32 baseCompare = keccak256("");
		bytes32 titleCompare = keccak256(bytes(_title));
		bytes32 descriptionCompare = keccak256(bytes(_description));
		require(
			titleCompare != baseCompare && descriptionCompare != baseCompare,
			"Title and Description are both required fields."
		);
		require(_target > 0, "Your money target must be greater than 0.");

		FundRun storage fundRun = fundRuns[numberOfFundRuns];
		fundRun.id = numberOfFundRuns;
		fundRun.owners = _owners;
		fundRun.title = _title;
		fundRun.description = _description;
		fundRun.target = _target;
		fundRun.deadline = fundRunDeadline;
		fundRun.amountCollected = 0;
		fundRun.amountWithdrawn = 0;
		fundRun.isActive = true;

		fundRunOwners.push(msg.sender); //todo: rename to fundRunCreators???
		numberOfFundRuns++;
		emit FundRunCreated(
			fundRun.id,
			fundRun.owners,
			fundRun.title,
			fundRun.target
		);
	}

	function donateToFundRun(
		uint16 _id
	)
		public
		payable
		ownsThisFundRun(_id, msg.sender, false)
		fundRunCompleted(_id, false)
	{
		require(msg.value > 0, "Minimum payment amount not met.");
		uint256 amount = msg.value;

		FundRun storage fundRun = fundRuns[_id];

		fundRun.donors.push(msg.sender);
		fundRun.donations.push(amount);

		/**
		 * @dev next few lines are how a person can donate to multiple fund runs (multiple times)
		 * while still keeping the donations logged separately for proper withdrawal
		 * Donor's Address _> Donor Log _> mapping(fundRunID => donationAmount)
		 * The reason this crucial mapping is not on the FundRun struct is
		 * because mappings within structs can't be sent to the front-end
		 */
		DonorsLog storage donorLog = donorLogs[msg.sender];
		if (donorLog.donor != msg.sender) donorLog.donor = msg.sender; //for first run
		uint256 previouslyDonated = donorLog.donorMoneyLog[fundRun.id];
		donorLog.donorMoneyLog[fundRun.id] = amount + previouslyDonated;
		uint256 newAmountCollected = fundRun.amountCollected + amount;
		fundRun.amountCollected = newAmountCollected;

		emit DonationOccurred(fundRun.owners, msg.sender, amount);
	}

	function fundRunOwnerWithdraw(
		uint16 _id
	)
		public
		nonReentrant
		isMultisig(_id, false) ///owner withdrawals not allowed for multisigs -- they will behave like a vault
		ownsThisFundRun(_id, msg.sender, true)
		fundRunCompleted(_id, true)
		fundRunSucceeded(_id, true)
	{
		FundRun storage fundRun = fundRuns[_id];
		require(fundRun.amountCollected > 0, "There is nothing to withdraw");
		require(
			fundRun.amountCollected > fundRun.amountWithdrawn,
			"This Fund Run is empty -- a withdrawal may have already occurred."
		);
		uint256 grossWithdrawAmount = fundRun.amountCollected -
			fundRun.amountWithdrawn;
		require(
			grossWithdrawAmount > 0,
			"There is nothing to withdraw -- a withdrawal may have already occurred."
		);

		/**
		 * @dev in this scenario, the amount that is previously withdrawn should always be 0
		 * So, here's some 'Redundancy' coming to you in the form of a 'Safety Measure'
		 *
		 * ADD the would-be withdrawal amount to the actual withdrawn amount
		 * and ensure they are going to be less-than/equal-to the Fund Run's total balance ("amountCollected")
		 */
		require(
			(grossWithdrawAmount + fundRun.amountWithdrawn) <=
				fundRun.amountCollected,
			"This Fund Run is hereby prevented from being over-drawn."
		);

		//contract takes its cut
		uint256 fundsMinusCommission = (grossWithdrawAmount *
			crowdFundCommission) / crowdFundDenominator; //0.25%
		uint256 netWithdrawAmount = grossWithdrawAmount - fundsMinusCommission;

		fundRun.amountWithdrawn = fundRun.amountWithdrawn + grossWithdrawAmount;

		//update profit amount
		commissionPayout = commissionPayout + fundsMinusCommission;

		if (fundRun.isActive) fundRun.isActive = false;

		(bool success, ) = payable(msg.sender).call{ value: netWithdrawAmount }(
			""
		);

		require(success, "Withdrawal reverted.");
		if (success)
			emit FundRunOwnerWithdrawal(fundRun.owners, netWithdrawAmount);
		//TODO: Handle else. Not done yet, because how this works will change
	}

	function fundRunDonorWithdraw(
		uint16 _id
	)
		public
		nonReentrant
		ownsThisFundRun(_id, msg.sender, false)
		fundRunCompleted(_id, true)
		fundRunSucceeded(_id, false)
	{
		FundRun storage fundRun = fundRuns[_id];
		DonorsLog storage donorLog = donorLogs[msg.sender];
		uint256 amountToWithdraw = donorLog.donorMoneyLog[fundRun.id];
		require(
			amountToWithdraw > 0,
			"There is nothing to withdraw - Have you already withdrawn?"
		);

		///@dev ADD the would-be withdrawal amount to the actual withdrawn amount
		///and ensure they are going to be less-than/equal-to the Fund Run's total balance ("amountCollected")
		require(
			(amountToWithdraw + fundRun.amountWithdrawn) <=
				fundRun.amountCollected,
			"This Fund Run is hereby prevented from being over-drawn."
		);

		donorLog.donorMoneyLog[fundRun.id] = 0;

		if (fundRun.isActive) fundRun.isActive = false;
		fundRun.amountWithdrawn = fundRun.amountWithdrawn + amountToWithdraw;

		(bool success, ) = payable(msg.sender).call{ value: amountToWithdraw }(
			""
		);

		require(success, "Withdrawal reverted.");
		if (success)
			emit DonorWithdrawal(fundRun.owners, msg.sender, amountToWithdraw);
		//TODO: Handle else. Not done yet, because how this works will change
	}

	/**
	 * @dev  (OnlyOwner can) Withdraw the profits this contract has made
	 */
	function contractOwnerWithdraw() public onlyOwner nonReentrant {
		require(commissionPayout > 0, "Nothing to withdraw");

		uint256 amountToWithdraw = commissionPayout;
		commissionPayout = 0;
		totalProfitsTaken = totalProfitsTaken + amountToWithdraw;

		(bool success, ) = payable(msg.sender).call{ value: amountToWithdraw }(
			""
		);

		require(success, "Withdrawal reverted.");
		if (success) emit ContractOwnerWithdrawal(msg.sender, amountToWithdraw);
	}

	function _verifyMultisigRequest(
		MultiSigRequest calldata _tx,
		uint256 _nonce,
		bytes[] storage _signatures,
		uint16 _fundRunId
	) private {
		require(_nonce > nonce, "nonce already used");
		uint256 signaturesCount = _signatures.length;
		require(
			signaturesCount == fundRuns[_fundRunId].owners.length,
			"not enough signers"
		);
		bytes32 digest = _processMultisigRequest(_tx, _nonce);

		address initialSigner;
		for (uint256 i = 0; i < signaturesCount; i++) {
			bytes memory signature = _signatures[i];
			address signer = ECDSA.recover(digest, signature);
			require(
				isOwnerOfFundRun(signer, _fundRunId),
				"Possible Issues: Proposal completed, problem with signature, or you are not a co-owner of this Fund Run."
			);
			require(
				signer != initialSigner,
				"duplicate signature has been prevented."
			);
			initialSigner = signer;
		}
		nonce = _nonce;
	}

	function _processMultisigRequest(
		MultiSigRequest calldata _tx,
		uint256 _nonce
	) private pure returns (bytes32 _digest) {
		bytes memory encoded = abi.encode(_tx);
		_digest = keccak256(abi.encodePacked(encoded, _nonce));
		_digest = keccak256(abi.encodePacked(MSG_PREFIX, _digest));
	}

	function _multisigTransfer(
		MultiSigRequest calldata _tx,
		uint16 _fundRunId,
		uint16 _proposalId
	) private {
		FundRun storage fundRun = fundRuns[_fundRunId];
		require(fundRun.amountCollected > 0, "There is nothing to withdraw");
		require(
			fundRun.amountCollected > fundRun.amountWithdrawn,
			"This Fund Run is empty -- withdrawals may have already occurred."
		);
		require(
			_tx.amount > 0,
			"The proposed transaction withdrawal amount is 0."
		);
		require(
			fundRun.amountWithdrawn + _tx.amount <= fundRun.amountCollected,
			"This Fund Run is hereby prevented from being over-drawn."
		);

		//contract takes its cut
		uint256 fundsMinusCommission = (_tx.amount * crowdFundCommission) /
			crowdFundDenominator; //0.25%
		uint256 netWithdrawAmount = _tx.amount - fundsMinusCommission;

		fundRun.amountWithdrawn = fundRun.amountWithdrawn + _tx.amount;
		//update profit amount
		commissionPayout = commissionPayout + fundsMinusCommission;

		if (fundRun.isActive) fundRun.isActive = false;

		(bool success, ) = payable(_tx.to).call{ value: netWithdrawAmount }("");
		changeProposalStatus(_fundRunId, _proposalId, 2);

		require(success, "Transfer not fulfilled");

		emit MultisigTransferCompleted(
			_fundRunId,
			_proposalId,
			_tx.to,
			netWithdrawAmount
		);
	}

	function changeProposalStatus(
		uint16 _fundRunId,
		uint16 _proposalId,
		uint16 _newStatus
	) private {
		for (uint16 i = 0; i < vaults[_fundRunId].length; i++) {
			if (vaults[_fundRunId][i].proposalId == _proposalId) {
				if (vaults[_fundRunId][i].status != ProposalStatus(_newStatus))
					vaults[_fundRunId][i].status = ProposalStatus(_newStatus);
				break;
			}
		}
	}

	/**
	 * @dev Returns donor and donation arrays, for a Fund Run
	 */
	function getDonors(
		uint16 _id
	) public view returns (address[] memory, uint256[] memory) {
		return (fundRuns[_id].donors, fundRuns[_id].donations);
	}

	/**
	 * @dev Returns list of Fund Runs in reverse order (latest-first)
	 */
	function getFundRuns() public view returns (FundRun[] memory) {
		FundRun[] memory allFundRuns = new FundRun[](numberOfFundRuns);

		for (uint16 i = 1; i < numberOfFundRuns + 1; i++) {
			FundRun storage item = fundRuns[numberOfFundRuns - i];
			allFundRuns[i - 1] = item;
		}
		return allFundRuns;
	}

	/**
	 * @dev Returns list of Proposals (from a Fund Run's Vault) in reverse order (latest-first)
	 */
	function getProposals(
		uint16 _fundRunId
	) public view returns (MultiSigVault[] memory) {
		// MultiSigVault[] memory allProposals = new MultiSigVault[](vaults[_fundRunId].length);

		// for (uint16 i = 1; i < vaults[_fundRunId].length + 1; i++) {
		// 	MultiSigVault storage item = vaults[_fundRunId][i - i];
		// 	allProposals[i - 1] = item;
		// }
		// return allProposals;

		//TODO: A:2

		return vaults[_fundRunId];
	}

	function getFundRun(uint16 _id) public view returns (FundRun memory) {
		FundRun storage fundRun = fundRuns[_id];
		return fundRun;
	}

	function timeLeft(uint16 _id) public view returns (uint256) {
		FundRun storage fundRun = fundRuns[_id];
		require(block.timestamp < fundRun.deadline, "It's ovaaaa");
		return fundRun.deadline - block.timestamp;
	}

	function getBalance()
		public
		view
		returns (uint256 crowdFund_contractBalance)
	{
		return address(this).balance;
	}

	function getOwnersOfFundRun(
		uint16 _id
	) public view returns (address[] memory) {
		FundRun storage fr = fundRuns[_id];
		return fr.owners;
	}

	function isOwnerOfFundRun(
		address _addr,
		uint16 _id
	) public view returns (bool) {
		FundRun storage thisFundRun = fundRuns[_id];
		for (uint16 i = 0; i < thisFundRun.owners.length; i++) {
			if (thisFundRun.owners[i] == _addr) return true;
		}
		return false;
	}

	function getNonce() public view returns (uint256) {
		return nonce;
	}
}
