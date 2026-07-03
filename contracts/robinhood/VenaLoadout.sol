// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IVenaLoadout.sol";

/**
 * @title VenaLoadout
 * @notice Extensible miner chassis — level + accessory catalog (buy/equip).
 *         Feature flags default OFF; flip when ready to open shop in UI.
 *
 * Multiplier stack (matches miner UI intent):
 *   base 10000 bps + level linear bonus, then × each equipped accessory bonus.
 */
contract VenaLoadout is IVenaLoadout, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_LEVEL = 15;
    uint256 public constant MAX_EQUIPPED = 2;

    IERC20 public immutable venaToken;
    address public treasury;

    bool public levelUpgradesEnabled;
    bool public accessoryShopEnabled;

    /// @notice +500 bps per level above 1 → Lv.5 = +2000 bps (+20%)
    uint256 public levelBonusBpsPerLevel = 500;

    /// @notice Level 1→2 = 250k VENA, each step ×1.4 (18 decimals)
    uint256 public levelBaseCost = 250_000 ether;
    uint256 public levelCostNumerator = 14;
    uint256 public levelCostDenominator = 10;

    struct AccessoryDef {
        uint256 priceVena;
        uint16 bonusBps;
        bool active;
    }

    /// @dev Accessory ids start at 1. Owner can add more over time.
    mapping(uint256 => AccessoryDef) public accessories;
    uint256 public accessoryCount;

    mapping(address => uint8) public level;
    mapping(address => uint256) public ownedAccessoryBits;
    mapping(address => uint256) public equippedAccessoryBits;

    event TreasurySet(address indexed treasury);
    event LevelUpgradesEnabled(bool enabled);
    event AccessoryShopEnabled(bool enabled);
    event LevelUpgraded(address indexed user, uint8 newLevel, uint256 venaPaid);
    event AccessoryAdded(uint256 indexed id, uint256 priceVena, uint16 bonusBps);
    event AccessoryUpdated(uint256 indexed id, uint256 priceVena, uint16 bonusBps, bool active);
    event AccessoryPurchased(address indexed user, uint256 indexed id, uint256 priceVena);
    event AccessoryEquipped(address indexed user, uint256 indexed id, bool equipped);
    event LevelBonusSet(uint256 bpsPerLevel);
    event LevelCostParamsSet(uint256 baseCost, uint256 numerator, uint256 denominator);

    constructor(address _vena, address _treasury, address initialOwner) Ownable(initialOwner) {
        require(_vena != address(0) && _treasury != address(0), "Zero address");
        venaToken = IERC20(_vena);
        treasury = _treasury;
        level[initialOwner] = 1;

        _registerAccessory(1, 200_000 ether, 500, true); // Flux Band +5%
        _registerAccessory(2, 400_000 ether, 1000, true); // Power Ring +10%
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Zero address");
        treasury = _treasury;
        emit TreasurySet(_treasury);
    }

    function setLevelUpgradesEnabled(bool enabled) external onlyOwner {
        levelUpgradesEnabled = enabled;
        emit LevelUpgradesEnabled(enabled);
    }

    function setAccessoryShopEnabled(bool enabled) external onlyOwner {
        accessoryShopEnabled = enabled;
        emit AccessoryShopEnabled(enabled);
    }

    function setLevelBonusBpsPerLevel(uint256 bps) external onlyOwner {
        levelBonusBpsPerLevel = bps;
        emit LevelBonusSet(bps);
    }

    function setLevelCostParams(
        uint256 baseCost,
        uint256 numerator,
        uint256 denominator
    ) external onlyOwner {
        require(numerator > 0 && denominator > 0, "Invalid ratio");
        levelBaseCost = baseCost;
        levelCostNumerator = numerator;
        levelCostDenominator = denominator;
        emit LevelCostParamsSet(baseCost, numerator, denominator);
    }

    /// @notice Register a new accessory id (extensible catalog).
    function addAccessory(uint256 id, uint256 priceVena, uint16 bonusBps) external onlyOwner {
        require(id > 0 && !accessories[id].active && accessories[id].priceVena == 0, "Id taken");
        _registerAccessory(id, priceVena, bonusBps, true);
    }

    function updateAccessory(
        uint256 id,
        uint256 priceVena,
        uint16 bonusBps,
        bool active
    ) external onlyOwner {
        require(id > 0 && accessories[id].priceVena != 0, "Unknown id");
        accessories[id] = AccessoryDef(priceVena, bonusBps, active);
        emit AccessoryUpdated(id, priceVena, bonusBps, active);
    }

    function levelUpgradeCost(uint8 currentLevel) public view returns (uint256) {
        require(currentLevel >= 1 && currentLevel < MAX_LEVEL, "Max level");
        uint256 cost = levelBaseCost;
        for (uint8 i = 1; i < currentLevel; i++) {
            cost = (cost * levelCostNumerator) / levelCostDenominator;
        }
        return cost;
    }

    function powerMultiplierBps(address user) external view returns (uint256) {
        return _multiplierBps(user);
    }

    function ownsAccessory(address user, uint256 id) public view returns (bool) {
        if (id == 0) return false;
        return (ownedAccessoryBits[user] >> id) & 1 == 1;
    }

    function isEquipped(address user, uint256 id) public view returns (bool) {
        if (id == 0) return false;
        return (equippedAccessoryBits[user] >> id) & 1 == 1;
    }

    function equippedCount(address user) public view returns (uint256) {
        uint256 bits = equippedAccessoryBits[user];
        uint256 count;
        while (bits != 0) {
            count += bits & 1;
            bits >>= 1;
        }
        return count;
    }

    function upgradeLevel() external nonReentrant {
        require(levelUpgradesEnabled, "Level upgrades closed");
        uint8 lv = level[msg.sender];
        require(lv < MAX_LEVEL, "Max level");
        uint256 cost = levelUpgradeCost(lv);
        venaToken.safeTransferFrom(msg.sender, treasury, cost);
        level[msg.sender] = lv + 1;
        emit LevelUpgraded(msg.sender, lv + 1, cost);
    }

    function buyAccessory(uint256 id) external nonReentrant {
        require(accessoryShopEnabled, "Accessory shop closed");
        AccessoryDef memory def = accessories[id];
        require(def.active && def.priceVena > 0, "Invalid accessory");
        require(!ownsAccessory(msg.sender, id), "Already owned");
        venaToken.safeTransferFrom(msg.sender, treasury, def.priceVena);
        ownedAccessoryBits[msg.sender] |= (1 << id);
        emit AccessoryPurchased(msg.sender, id, def.priceVena);
    }

    function setAccessoryEquipped(uint256 id, bool equipped) external {
        require(ownsAccessory(msg.sender, id), "Not owned");
        AccessoryDef memory def = accessories[id];
        require(def.active, "Inactive");

        if (equipped) {
            require(!isEquipped(msg.sender, id), "Already equipped");
            require(equippedCount(msg.sender) < MAX_EQUIPPED, "Equip cap");
            equippedAccessoryBits[msg.sender] |= (1 << id);
        } else {
            require(isEquipped(msg.sender, id), "Not equipped");
            equippedAccessoryBits[msg.sender] &= ~(1 << id);
        }
        emit AccessoryEquipped(msg.sender, id, equipped);
    }

    function _registerAccessory(
        uint256 id,
        uint256 priceVena,
        uint16 bonusBps,
        bool active
    ) internal {
        accessories[id] = AccessoryDef(priceVena, bonusBps, active);
        if (id > accessoryCount) accessoryCount = id;
        emit AccessoryAdded(id, priceVena, bonusBps);
    }

    function _multiplierBps(address user) internal view returns (uint256) {
        uint8 lv = level[user];
        if (lv < 1) lv = 1;
        uint256 mult = BPS + uint256(lv - 1) * levelBonusBpsPerLevel;

        uint256 bits = equippedAccessoryBits[user];
        for (uint256 id = 1; id <= accessoryCount && bits != 0; id++) {
            if ((bits >> id) & 1 == 1) {
                uint16 bonus = accessories[id].bonusBps;
                mult = (mult * (BPS + bonus)) / BPS;
                bits &= ~(1 << id);
            }
        }
        return mult;
    }
}