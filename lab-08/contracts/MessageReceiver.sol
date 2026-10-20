// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";

contract MessageReceiver {
    bytes32 public lastMessageId;
    string public lastText;

    event MessageReceived(bytes32 indexed messageId, uint64 sourceChainSelector, string text);

    function ccipReceive(Client.Any2EVMMessage calldata message) external {
        lastMessageId = message.messageId;
        lastText = abi.decode(message.data, (string));
        emit MessageReceived(message.messageId, message.sourceChainSelector, lastText);
    }

    // IERC165 + IAny2EVMMessageReceiver
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == 0x85572ffb;
    }
}
