// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice CREATE2 helper for VenaHook (address must end in 0x0044).
contract Create2Deploy {
    event Deployed(address addr, bytes32 salt);

    function deploy(bytes32 salt, bytes memory initCode) external returns (address addr) {
        assembly {
            addr := create2(0, add(initCode, 0x20), mload(initCode), salt)
        }
        require(addr != address(0), "CREATE2 failed");
        emit Deployed(addr, salt);
    }
}
