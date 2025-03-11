// StrategyGame.js
import React, { useState, useEffect, useRef } from 'react';
import './StrategyGame.css';

// 主游戏组件
const StrategyGame = () => {
  // 游戏常量设置
  const GRID_SIZE = 30; // 扩大到50x50
  const CELL_SIZE = 60;
  const VISIBLE_GRID = 12; // 视口可见网格数量
  const VISIBILITY_RANGE = 4; // 单位视野范围
  const AI_THINK_TIME = 1000; // AI思考时间(毫秒)
  
  // 视口状态
  const [viewportX, setViewportX] = useState(0);
  const [viewportY, setViewportY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // 游戏状态
  const [currentPlayer, setCurrentPlayer] = useState(1); // 1 = 红方/玩家, 2 = 蓝方/AI
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [movableArea, setMovableArea] = useState([]);
  const [attackableArea, setAttackableArea] = useState([]);
  const [gameStatus, setGameStatus] = useState('进行中');
  const [aiThinking, setAiThinking] = useState(false);
  
  // 战争迷雾
  const [visibility, setVisibility] = useState(
    Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0))
  ); // 0=未探索, 1=已探索但当前不可见, 2=当前可见
  
  // 视口拖动相关
  const gameboardRef = useRef(null);
  
  // 初始化游戏单位
  const [units, setUnits] = useState([
    // 玩家单位 - 保持相同位置
    { id: 1, player: 1, type: 'warrior', x: 3, y: 3, hp: 100, maxHp: 100, atk: 30, moveRange: 3, atkRange: 1, moved: false, attacked: false },
    { id: 2, player: 1, type: 'archer', x: 3, y: 4, hp: 70, maxHp: 70, atk: 40, moveRange: 2, atkRange: 3, moved: false, attacked: false },
    { id: 3, player: 1, type: 'knight', x: 4, y: 3, hp: 120, maxHp: 120, atk: 25, moveRange: 4, atkRange: 1, moved: false, attacked: false },
    
    // 敌方单位 - 调整到30x30地图范围内
    { id: 4, player: 2, type: 'warrior', x: 25, y: 25, hp: 100, maxHp: 100, atk: 30, moveRange: 3, atkRange: 1, moved: false, attacked: false },
    { id: 5, player: 2, type: 'archer', x: 25, y: 26, hp: 70, maxHp: 70, atk: 40, moveRange: 2, atkRange: 3, moved: false, attacked: false },
    { id: 6, player: 2, type: 'knight', x: 26, y: 25, hp: 120, maxHp: 120, atk: 25, moveRange: 4, atkRange: 1, moved: false, attacked: false },
    { id: 7, player: 2, type: 'warrior', x: 26, y: 26, hp: 100, maxHp: 100, atk: 30, moveRange: 3, atkRange: 1, moved: false, attacked: false },
    { id: 8, player: 2, type: 'archer', x: 27, y: 25, hp: 70, maxHp: 70, atk: 40, moveRange: 2, atkRange: 3, moved: false, attacked: false },
  ]);
  
  // 地形数据 (0 = 平地, 1 = 树林, 2 = 山地, 3 = 水域)
  const [terrain, setTerrain] = useState(Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0)));
  // 在其他状态变量附近添加
    const [fogOfWarEnabled, setFogOfWarEnabled] = useState(true); // 默认启用战争迷雾
  
    // 同步视口位置与滚动位置
    useEffect(() => {
        if (gameboardRef.current) {
        gameboardRef.current.scrollLeft = viewportX * CELL_SIZE;
        gameboardRef.current.scrollTop = viewportY * CELL_SIZE;
        }
    }, [viewportX, viewportY]);

  // 初始化随机地形
// 修改后
useEffect(() => {
    // 初始化逻辑
    const initGame = () => {
      const newTerrain = [...terrain];
      for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
          // 避免在起始位置放置障碍
          if ((i < 6 && j < 6) || (i > GRID_SIZE - 7 && j > GRID_SIZE - 7)) continue;
          
          const rand = Math.random();
          if (rand < 0.1) {
            newTerrain[i][j] = 1; // 10% 几率放置树林
          } else if (rand < 0.15) {
            newTerrain[i][j] = 2; // 5% 几率放置山地
          } else if (rand < 0.17) {
            newTerrain[i][j] = 3; // 2% 几率放置水域
          }
        }
      }
      setTerrain(newTerrain);
      
      // 初始更新战争迷雾
      updateVisibility(units.filter(u => u.player === 1));
      
      // 初始化视口位置到玩家单位
      const playerUnit = units.find(u => u.player === 1);
      if (playerUnit) {
        centerViewportOn(playerUnit.x, playerUnit.y);
      }
    };
    
    // 仅在组件挂载时执行一次
    initGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // 视口拖动控制函数
  const handleMouseDown = (e) => {
    if (e.button === 0) { // 仅左键拖动
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };
  
  const handleMouseMove = (e) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      // 更新视口位置
      setViewportX(prev => Math.max(0, Math.min(GRID_SIZE - VISIBLE_GRID, prev - dx / CELL_SIZE)));
      setViewportY(prev => Math.max(0, Math.min(GRID_SIZE - VISIBLE_GRID, prev - dy / CELL_SIZE)));
      
      // 更新拖动起点
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleMouseLeave = () => {
    setIsDragging(false);
  };
  
// 将视口中心设为指定坐标
const centerViewportOn = (x, y) => {
    // 计算滚动位置（中心点）
    const scrollX = Math.max(0, (x - Math.floor(VISIBLE_GRID / 2)) * CELL_SIZE);
    const scrollY = Math.max(0, (y - Math.floor(VISIBLE_GRID / 2)) * CELL_SIZE);
    
    // 计算视口位置
    const newX = Math.max(0, Math.min(GRID_SIZE - VISIBLE_GRID, x - Math.floor(VISIBLE_GRID / 2)));
    const newY = Math.max(0, Math.min(GRID_SIZE - VISIBLE_GRID, y - Math.floor(VISIBLE_GRID / 2)));
    
    // 更新视口位置状态
    setViewportX(newX);
    setViewportY(newY);
    
    // 如果 ref 已经存在，设置滚动位置
    if (gameboardRef.current) {
      gameboardRef.current.scrollLeft = scrollX;
      gameboardRef.current.scrollTop = scrollY;
    }
  };
  
  // 更新战争迷雾
  const updateVisibility = (playerUnits) => {
    // 创建新的可见性地图
    const newVisibility = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(1)); // 默认设为已探索但不可见
    
    // 为每个玩家单位计算可见区域
    playerUnits.forEach(unit => {
      const { x, y } = unit;
      
      // 使用曼哈顿距离确定可见范围
      for (let i = Math.max(0, x - VISIBILITY_RANGE); i <= Math.min(GRID_SIZE - 1, x + VISIBILITY_RANGE); i++) {
        for (let j = Math.max(0, y - VISIBILITY_RANGE); j <= Math.min(GRID_SIZE - 1, y + VISIBILITY_RANGE); j++) {
          const distance = Math.abs(x - i) + Math.abs(y - j);
          
          if (distance <= VISIBILITY_RANGE) {
            newVisibility[i][j] = 2; // 设为当前可见
          }
        }
      }
    });
    
    // 更新状态，保留已探索的区域
    setVisibility(prev => prev.map((row, i) => 
      row.map((cell, j) => newVisibility[i][j] === 2 ? 2 : (cell > 0 ? 1 : 0))
    ));
  };
  
    // 计算可见区域的单元格
    const getVisibleGrid = () => {
        const visibleCells = [];
        
        // 计算视口中显示的单元格
        const startX = Math.floor(viewportX);
        const startY = Math.floor(viewportY);
        const endX = Math.min(GRID_SIZE, startX + VISIBLE_GRID);
        const endY = Math.min(GRID_SIZE, startY + VISIBLE_GRID);
        
        for (let x = startX; x < endX; x++) {
        for (let y = startY; y < endY; y++) {
            visibleCells.push({ x, y });
        }
        }
        
        return visibleCells;
    };

  // 计算单位可移动区域
  const calculateMovableArea = (unit) => {
    if (!unit) return [];
    
    const { x, y, moveRange } = unit;
    const area = [];
    
    // 使用简化的移动范围计算 (曼哈顿距离)
    for (let i = Math.max(0, x - moveRange); i <= Math.min(GRID_SIZE - 1, x + moveRange); i++) {
      for (let j = Math.max(0, y - moveRange); j <= Math.min(GRID_SIZE - 1, y + moveRange); j++) {
        const distance = Math.abs(x - i) + Math.abs(y - j);
        
        if (distance <= moveRange && !(i === x && j === y)) {
          // 检查地形移动惩罚
          let terrainPenalty = 0;
          if (terrain[i][j] === 1) terrainPenalty = 1; // 树林移动惩罚
          if (terrain[i][j] === 2) terrainPenalty = 2; // 山地移动惩罚
          if (terrain[i][j] === 3) continue; // 水域不可通行
          
          if (distance + terrainPenalty <= moveRange) {
            // 检查是否已有单位占据该位置
            const unitAtPosition = units.find(u => u.x === i && u.y === j);
            if (!unitAtPosition) {
              area.push({ x: i, y: j });
            }
          }
        }
      }
    }
    
    return area;
  };
  
    // 计算单位可攻击区域
    const calculateAttackableArea = (unit, newPosition = null) => {
        if (!unit) return [];
        
        // 使用新位置(移动后)或当前位置
        const x = newPosition ? newPosition.x : unit.x;
        const y = newPosition ? newPosition.y : unit.y;
        const { atkRange } = unit;
        const area = [];
        
        for (let i = Math.max(0, x - atkRange); i <= Math.min(GRID_SIZE - 1, x + atkRange); i++) {
        for (let j = Math.max(0, y - atkRange); j <= Math.min(GRID_SIZE - 1, y + atkRange); j++) {
            const distance = Math.abs(x - i) + Math.abs(y - j);
            
            if (distance <= atkRange && !(i === x && j === y)) {
            // 检查是否有敌方单位
            const targetUnit = units.find(u => u.x === i && u.y === j && u.player !== unit.player);
            if (targetUnit) {
                // 对于玩家单位，仅添加可见的敌方单位，除非迷雾禁用
                if (unit.player === 1 && fogOfWarEnabled && visibility[i][j] < 2) continue;
                area.push({ x: i, y: j, targetId: targetUnit.id });
            }
            }
        }
        }
        
        return area;
    };
  
  // 处理单位选择
  const handleUnitSelect = (unitId) => {
    const unit = units.find(u => u.id === unitId);
    
    // 只能选择当前玩家的单位，且未行动完毕的单位
    if (unit && unit.player === currentPlayer && !(unit.moved && unit.attacked)) {
      setSelectedUnit(unit);
      
      // 计算可移动和可攻击区域
      if (!unit.moved) {
        setMovableArea(calculateMovableArea(unit));
      } else {
        setMovableArea([]);
      }
      
      if (!unit.attacked) {
        setAttackableArea(calculateAttackableArea(unit));
      } else {
        setAttackableArea([]);
      }
      
      // 居中视图到选中单位
      centerViewportOn(unit.x, unit.y);
    } else {
      // 如果点击的是敌方单位或已行动完毕的单位，取消选择
      setSelectedUnit(null);
      setMovableArea([]);
      setAttackableArea([]);
    }
  };
  
  // 处理单元格点击
  const handleCellClick = (x, y) => {
    // 处理攻击
    const attackTarget = attackableArea.find(pos => pos.x === x && pos.y === y);
    if (selectedUnit && attackTarget) {
      // 执行攻击
      const targetUnit = units.find(u => u.id === attackTarget.targetId);
      if (targetUnit) {
        const newUnits = units.map(u => {
          if (u.id === targetUnit.id) {
            // 减少目标生命值
            const newHp = Math.max(0, u.hp - selectedUnit.atk);
            return { ...u, hp: newHp };
          }
          if (u.id === selectedUnit.id) {
            // 标记单位已攻击
            return { ...u, attacked: true };
          }
          return u;
        });
        
        // 移除hp为0的单位
        const filteredUnits = newUnits.filter(u => u.hp > 0);
        setUnits(filteredUnits);
        
        // 检查胜利条件
        checkVictoryCondition(filteredUnits);
        
        // 重置选择状态
        setSelectedUnit(prev => ({ ...prev, attacked: true }));
        setAttackableArea([]);
        
        // 检查单位是否已完成所有行动
        const updatedUnit = newUnits.find(u => u.id === selectedUnit.id);
        if (updatedUnit && updatedUnit.moved && updatedUnit.attacked) {
          setSelectedUnit(null);
        } else if (updatedUnit) {
          // 更新可攻击区域
          setAttackableArea(calculateAttackableArea(updatedUnit));
        }
        
        return;
      }
    }
    
    // 处理移动
    const canMoveTo = movableArea.find(pos => pos.x === x && pos.y === y);
    if (selectedUnit && canMoveTo) {
      // 移动单位
      const newUnits = units.map(u => {
        if (u.id === selectedUnit.id) {
          return { ...u, x, y, moved: true };
        }
        return u;
      });
      
      setUnits(newUnits);
      
      // 更新选中的单位
      const movedUnit = { ...selectedUnit, x, y, moved: true };
      setSelectedUnit(movedUnit);
      
      // 清除移动区域
      setMovableArea([]);
      
      // 更新攻击区域（基于新位置）
      if (!movedUnit.attacked) {
        setAttackableArea(calculateAttackableArea(movedUnit));
      }
      
      // 如果是玩家单位移动，更新战争迷雾
      if (movedUnit.player === 1) {
        updateVisibility(newUnits.filter(u => u.player === 1));
      }
    }
  };
  
  // 结束回合
  const endTurn = (skipAITurn = false) => {
    // 切换当前玩家
    const nextPlayer = currentPlayer === 1 ? 2 : 1;
    setCurrentPlayer(nextPlayer);
    
    // 重置单位状态
    const newUnits = units.map(u => {
      if (u.player === nextPlayer) {
        return { ...u, moved: false, attacked: false };
      }
      return u;
    });
    
    setUnits(newUnits);
    
    // 清除选择状态
    setSelectedUnit(null);
    setMovableArea([]);
    setAttackableArea([]);
    
    // 如果下一个玩家是AI且不是从AI回合结束时调用，执行AI回合
    if (nextPlayer === 2 && !skipAITurn) {
      setAiThinking(true);
      setTimeout(() => runAiTurn(), AI_THINK_TIME);
    }
  };
  
    // 处理滚动事件
    const handleScroll = (e) => {
        const { scrollLeft, scrollTop } = e.target;
        
        // 计算新的视口位置（以格子为单位）
        const newViewportX = Math.floor(scrollLeft / CELL_SIZE);
        const newViewportY = Math.floor(scrollTop / CELL_SIZE);
        
        // 更新视口位置状态（仅在发生变化时）
        if (newViewportX !== viewportX) {
        setViewportX(newViewportX);
        }
        if (newViewportY !== viewportY) {
        setViewportY(newViewportY);
        }
    };

  // AI回合逻辑
  const runAiTurn = () => {
    // 获取所有AI单位
    const aiUnits = [...units].filter(u => u.player === 2);
    
    if (aiUnits.length === 0) {
      setAiThinking(false);
      endTurn(true); // AI没有单位，切回玩家回合
      return;
    }
    
    // 处理每个AI单位
    let updatedUnits = [...units];
    
    // 简单AI决策逻辑
    for (const aiUnit of aiUnits) {
      // 如果该单位已不在游戏中（可能被摧毁），跳过
      if (!updatedUnits.find(u => u.id === aiUnit.id)) continue;
      
      // 获取最新单位状态
      const currentUnitState = updatedUnits.find(u => u.id === aiUnit.id);
      
      // 1. 优先尝试攻击
      const attackableTargets = calculateAttackableArea(currentUnitState);
      
    // 修改后
    if (attackableTargets.length > 0 && !currentUnitState.attacked) {
        // 找到血量最低的目标优先攻击
        const targets = attackableTargets.map(pos => {
        const target = updatedUnits.find(u => u.id === pos.targetId);
        return { pos, target };
        }).sort((a, b) => a.target.hp - b.target.hp);
        
        const bestTarget = targets[0];
        const bestTargetId = bestTarget.target.id;
        const currentUnitId = currentUnitState.id;
        const attackPower = currentUnitState.atk;
        
        // 执行攻击 - 不在循环中引用 updatedUnits
        updatedUnits = updatedUnits.map(u => {
        if (u.id === bestTargetId) {
            // 减少目标生命值
            const newHp = Math.max(0, u.hp - attackPower);
            return { ...u, hp: newHp };
        }
        if (u.id === currentUnitId) {
            // 标记单位已攻击
            return { ...u, attacked: true };
        }
        return u;
        });
        
        // 移除hp为0的单位
        updatedUnits = updatedUnits.filter(u => u.hp > 0);
    }
      
      // 2. 如果没有攻击或攻击后仍能移动，尝试移动
    const updatedUnitAfterAttack = updatedUnits.find(u => u.id === aiUnit.id);

    if (updatedUnitAfterAttack && !updatedUnitAfterAttack.moved) {
    const movablePositions = calculateMovableArea(updatedUnitAfterAttack);
    
    if (movablePositions.length > 0) {
        // 找出所有玩家单位
        const playerUnits = updatedUnits.filter(u => u.player === 1);
        
        if (playerUnits.length > 0) {
        // 找出最近的玩家单位
        const unitX = updatedUnitAfterAttack.x;
        const unitY = updatedUnitAfterAttack.y;
        
        // 计算到每个玩家单位的距离
        const nearestPlayer = playerUnits
            .map(pu => ({
            unit: pu,
            distance: Math.abs(unitX - pu.x) + Math.abs(unitY - pu.y)
            }))
            .sort((a, b) => a.distance - b.distance)[0].unit;
        
        // 计算移动方向 - 这是改进的关键部分
        const directionX = nearestPlayer.x > unitX ? 1 : (nearestPlayer.x < unitX ? -1 : 0);
        const directionY = nearestPlayer.y > unitY ? 1 : (nearestPlayer.y < unitY ? -1 : 0);
        
        // 尝试找到最佳移动位置 - 优先朝着目标方向移动
        let bestMove = null;
        
        // 首先尝试沿着两个方向同时移动（如果可能）
        const diagonalMoves = movablePositions.filter(pos => 
            (directionX !== 0 && pos.x === unitX + directionX) && 
            (directionY !== 0 && pos.y === unitY + directionY)
        );
        
        if (diagonalMoves.length > 0) {
            bestMove = diagonalMoves[0];
        } else {
            // 然后尝试沿着X方向移动
            const xMoves = movablePositions.filter(pos => 
            (directionX !== 0 && pos.x === unitX + directionX) && 
            pos.y === unitY
            );
            
            if (xMoves.length > 0) {
            bestMove = xMoves[0];
            } else {
            // 然后尝试沿着Y方向移动
            const yMoves = movablePositions.filter(pos => 
                pos.x === unitX && 
                (directionY !== 0 && pos.y === unitY + directionY)
            );
            
            if (yMoves.length > 0) {
                bestMove = yMoves[0];
            } else {
                // 如果以上都不行，回退到现有策略：选择距离最近的位置
                const distancesToPlayers = movablePositions.map(pos => {
                return {
                    pos,
                    distance: Math.abs(pos.x - nearestPlayer.x) + Math.abs(pos.y - nearestPlayer.y)
                };
                });
                
                bestMove = distancesToPlayers.sort((a, b) => a.distance - b.distance)[0].pos;
            }
            }
        }
        
        // 执行移动
        if (bestMove) {
            updatedUnits = updatedUnits.map(u => {
            if (u.id === updatedUnitAfterAttack.id) {
                return { ...u, x: bestMove.x, y: bestMove.y, moved: true };
            }
            return u;
            });
            
            // 移动后检查是否可以攻击
            const unitAfterMove = {
            ...updatedUnitAfterAttack,
            x: bestMove.x,
            y: bestMove.y,
            moved: true
            };
            
            // 移动后尝试攻击
            if (!unitAfterMove.attacked) {
            const newAttackableTargets = calculateAttackableArea(unitAfterMove);
            
            if (newAttackableTargets.length > 0) {
                // 找到血量最低的目标优先攻击
                const targetsData = [];
                for (const pos of newAttackableTargets) {
                const target = updatedUnits.find(u => u.id === pos.targetId);
                targetsData.push({ pos, target });
                }
                
                const sortedTargets = targetsData.sort((a, b) => a.target.hp - b.target.hp);
                const bestTarget = sortedTargets[0];
                const bestTargetId = bestTarget.target.id;
                const unitAfterId = unitAfterMove.id;
                const attackPower = unitAfterMove.atk;
                
                // 执行攻击
                updatedUnits = updatedUnits.map(u => {
                if (u.id === bestTargetId) {
                    // 减少目标生命值
                    const newHp = Math.max(0, u.hp - attackPower);
                    return { ...u, hp: newHp };
                }
                if (u.id === unitAfterId) {
                    // 标记单位已攻击
                    return { ...u, attacked: true };
                }
                return u;
                });
                
                // 移除hp为0的单位
                updatedUnits = updatedUnits.filter(u => u.hp > 0);
            }
            }
        }
        }
    }
    }
}
    
    // 更新单位状态
    setUnits(updatedUnits);
    
    // 检查胜利条件
    checkVictoryCondition(updatedUnits);
    
    // 再次更新战争迷雾，因为AI可能消灭了一些玩家单位
    updateVisibility(updatedUnits.filter(u => u.player === 1));
    
    // AI回合结束，直接切换回玩家回合
    setAiThinking(false);
    setCurrentPlayer(1); // 直接切换到玩家1
    // 重置玩家1单位状态
    const updatedPlayerUnits = updatedUnits.map(u => {
    if (u.player === 1) {
        return { ...u, moved: false, attacked: false };
    }
    return u;
    });
    setUnits(updatedPlayerUnits);
  };
  
  // 检查胜利条件
  const checkVictoryCondition = (currentUnits) => {
    const player1Units = currentUnits.filter(u => u.player === 1);
    const player2Units = currentUnits.filter(u => u.player === 2);
    
    if (player1Units.length === 0) {
      setGameStatus('蓝方胜利！');
    } else if (player2Units.length === 0) {
      setGameStatus('红方胜利！');
    }
  };
  

// restartGame 函数完整代码
const restartGame = () => {
    // 重置单位
    // restartGame 函数中的单位重置部分
    setUnits([
        { id: 1, player: 1, type: 'warrior', x: 3, y: 3, hp: 100, maxHp: 100, atk: 30, moveRange: 3, atkRange: 1, moved: false, attacked: false },
        { id: 2, player: 1, type: 'archer', x: 3, y: 4, hp: 70, maxHp: 70, atk: 40, moveRange: 2, atkRange: 3, moved: false, attacked: false },
        { id: 3, player: 1, type: 'knight', x: 4, y: 3, hp: 120, maxHp: 120, atk: 25, moveRange: 4, atkRange: 1, moved: false, attacked: false },
        { id: 4, player: 2, type: 'warrior', x: 25, y: 25, hp: 100, maxHp: 100, atk: 30, moveRange: 3, atkRange: 1, moved: false, attacked: false },
        { id: 5, player: 2, type: 'archer', x: 25, y: 26, hp: 70, maxHp: 70, atk: 40, moveRange: 2, atkRange: 3, moved: false, attacked: false },
        { id: 6, player: 2, type: 'knight', x: 26, y: 25, hp: 120, maxHp: 120, atk: 25, moveRange: 4, atkRange: 1, moved: false, attacked: false },
        { id: 7, player: 2, type: 'warrior', x: 26, y: 26, hp: 100, maxHp: 100, atk: 30, moveRange: 3, atkRange: 1, moved: false, attacked: false },
        { id: 8, player: 2, type: 'archer', x: 27, y: 25, hp: 70, maxHp: 70, atk: 40, moveRange: 2, atkRange: 3, moved: false, attacked: false },
    ]);
    
    // 重置游戏状态
    setCurrentPlayer(1);
    setSelectedUnit(null);
    setMovableArea([]);
    setAttackableArea([]);
    setGameStatus('进行中');
    setAiThinking(false);
    
    // 重置战争迷雾
    setVisibility(Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0)));
    
    // 生成新的随机地形
    const newTerrain = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        // 避免在起始位置放置障碍
        if ((i < 6 && j < 6) || (i > GRID_SIZE - 7 && j > GRID_SIZE - 7)) continue;
        
        const rand = Math.random();
        if (rand < 0.1) {
          newTerrain[i][j] = 1; // 10% 几率放置树林
        } else if (rand < 0.15) {
          newTerrain[i][j] = 2; // 5% 几率放置山地
        } else if (rand < 0.17) {
          newTerrain[i][j] = 3; // 2% 几率放置水域
        }
      }
    }
    setTerrain(newTerrain);
    
    // 将视口重置到玩家初始位置
    centerViewportOn(3, 3);
    
  // 初始更新战争迷雾
  setTimeout(() => {
    if (fogOfWarEnabled) {
      updateVisibility([
        { x: 3, y: 3, player: 1 },
        { x: 3, y: 4, player: 1 },
        { x: 4, y: 3, player: 1 }
      ]);
    }
  }, 100);
};
  
  // 获取单位图标
  const getUnitIcon = (type) => {
    switch (type) {
      case 'warrior': return '⚔️';
      case 'archer': return '🏹';
      case 'knight': return '🐎';
      default: return '❓';
    }
  };
  
// 获取地形图标
const getTerrainIcon = (terrainType) => {
    switch (terrainType) {
      case 1: return '🌲';
      case 2: return '⛰️';
      case 3: return '💧';
      default: return '';
    }
  };
  
// 获取单元格类名
const getCellClassName = (x, y) => {
    // 基础类名
    let className = "game-cell";
    
    // 战争迷雾 - 仅在启用时应用
    if (fogOfWarEnabled && visibility[x][y] === 0) {
      return className + " cell-fog";
    }
    
    // 棋盘格颜色
    if ((x + y) % 2 === 0) {
      className += " cell-light";
    } else {
      className += " cell-dark";
    }
    
    // 半迷雾区域 (已探索但当前不可见) - 仅在启用时应用
    if (fogOfWarEnabled && visibility[x][y] === 1) {
      className += " cell-semi-fog";
    }
    
    // 可移动区域
    if (movableArea.some(pos => pos.x === x && pos.y === y)) {
      className += " cell-movable";
    }
    
    // 可攻击区域
    if (attackableArea.some(pos => pos.x === x && pos.y === y)) {
      className += " cell-attackable";
    }
    
    // 选中的单位
    if (selectedUnit && selectedUnit.x === x && selectedUnit.y === y) {
      className += " cell-selected";
    }
    
    return className;
  };
  
  return (
    <div className="game-container">
      <h1 className="game-title">战旗游戏Demo</h1>
      
      <div className="game-controls">
        <div className={`player-indicator ${currentPlayer === 1 ? 'player-red active' : 'player-red'}`}>
            红方{currentPlayer === 1 ? " (当前行动)" : ""}
        </div>
        <div className="control-buttons">
            {/* 添加战争迷雾开关 */}
            <div className="fog-toggle-container">
            <span className="fog-label">战争迷雾:</span>
            <label className="switch">
                <input 
                type="checkbox" 
                checked={fogOfWarEnabled}
                onChange={() => setFogOfWarEnabled(prev => !prev)}
                />
                <span className="slider round"></span>
            </label>
            </div>
            <button              
            onClick={() => endTurn(false)}              
            className="btn btn-end-turn"             
            disabled={gameStatus !== '进行中'}             
            >             
            结束回合
            </button>
            <button 
            onClick={restartGame} 
            className="btn btn-restart"
            >
            重新开始
            </button>
        </div>
        <div className={`player-indicator ${currentPlayer === 2 ? 'player-blue active' : 'player-blue'}`}>
            蓝方{currentPlayer === 2 ? " (当前行动)" : ""}
        </div>
        </div>
      
      <div className="game-board-container">
        {/* 游戏状态 */}
        {gameStatus !== '进行中' && (
          <div className="game-over-overlay">
            <div className="game-over-modal">
              <h2 className="game-over-title">{gameStatus}</h2>
              <button 
                onClick={restartGame} 
                className="btn btn-play-again"
              >
                再来一局
              </button>
            </div>
          </div>
        )}
        
        {/* 游戏棋盘 - 使用滚动条 */}
  <div 
    ref={gameboardRef}
    className="game-board-scrollable"
    onScroll={handleScroll}
  >
    <div 
      className="game-board"
      style={{
        gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
        gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`
      }}
    >
      {Array(GRID_SIZE).fill().map((_, x) => (
        Array(GRID_SIZE).fill().map((_, y) => {
          // 当前格子是否有单位
          const unit = units.find(u => u.x === x && u.y === y);
          
          return (
            <div 
                key={`${x}-${y}`} 
                className={getCellClassName(x, y)}
                onClick={(e) => {
                    // 只在非拖动状态下处理点击
                    if (!isDragging) {
                    unit ? handleUnitSelect(unit.id) : handleCellClick(x, y);
                    }
                    e.stopPropagation();
                }}
                >
                {/* 仅在非迷雾区域显示内容，或迷雾关闭时显示所有内容 */}
                {(!fogOfWarEnabled || visibility[x][y] > 0) && (
                    <>
                    {/* 地形 */}
                    <div className="terrain-icon">
                        {getTerrainIcon(terrain[x][y])}
                    </div>
                    
                    {/* 单位 - 根据迷雾状态决定是否显示敌方单位 */}
                    {(unit && (!fogOfWarEnabled || unit.player === 1 || visibility[x][y] === 2)) && (
                        <div 
                        className={`unit-container ${unit.player === 1 ? 'unit-red' : 'unit-blue'} ${(unit.moved && unit.attacked) ? 'unit-exhausted' : ''}`}
                        >
                        <div className="unit-icon">{getUnitIcon(unit.type)}</div>
                        <div className="unit-hp">{unit.hp}/{unit.maxHp}</div>
                        <div className="hp-bar-bg">
                            <div 
                            className={`hp-bar-fill ${unit.player === 1 ? 'hp-bar-red' : 'hp-bar-blue'}`}
                            style={{ width: `${(unit.hp / unit.maxHp) * 100}%` }}
                            ></div>
                        </div>
                        </div>
                    )}
                    </>
                )}
                </div>
          );
        })
      ))}
        </div>
        </div>
      
        {/* AI思考中显示 */}
        {aiThinking && (
        <div className="ai-thinking-overlay">
            <div className="ai-thinking-modal">
            <div className="ai-thinking-text">AI思考中...</div>
            <div className="ai-thinking-spinner"></div>
            </div>
        </div>
        )}

        {/* 战场信息 */}
        <div className="battlefield-info">
        <div className="info-panel">
            <div className="info-title">战场情报</div>
            <div className="info-content">
            <p>己方单位: {units.filter(u => u.player === 1).length} 个</p>
            <p>敌方单位: {units.filter(u => u.player === 2).length} 个</p>
            <p>回合: {currentPlayer === 1 ? "玩家行动" : "AI行动"}</p>
            </div>
        </div>
        </div>

      {/* 游戏说明 */}
      <div className="game-instructions">
        <h2 className="instructions-title">游戏说明:</h2>
        <ul className="instructions-list">
          <li>红方先行动，点击自己的单位选择，然后点击蓝色区域移动或红色区域攻击</li>
          <li>每个单位每回合可以移动一次、攻击一次，行动完毕变为半透明</li>
          <li>不同单位有不同的移动范围和攻击范围</li>
          <li>⚔️战士: HP 100, 攻击 30, 移动 3, 攻击范围 1</li>
          <li>🏹弓箭手: HP 70, 攻击 40, 移动 2, 攻击范围 3</li>
          <li>🐎骑士: HP 120, 攻击 25, 移动 4, 攻击范围 1</li>
          <li>🌲树林和⛰️山地会降低移动范围</li>
          <li>消灭所有敌方单位获胜</li>
        </ul>
      </div>
    </div>
    </div>
  );
};

export default StrategyGame;