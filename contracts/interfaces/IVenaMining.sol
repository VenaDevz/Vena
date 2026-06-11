// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVenaMining {
    function stakedBy(uint256 tokenId) external view returns (address);
    function forceUnstakeAndBurn(uint256 tokenId) external;
}
