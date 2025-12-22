/**
 * @example
 * 现代x64架构CPU Cache Line容量64bits
 * ECS，意味着Entity Component System架构，该架构利于缓存命中。
 * 由于CPU的一级缓存是一种不易拓展的固定资源，所以Entity越多，优化效果越好。
 * []u16(EnemyHp):   [enemy1|enemy2|enemy3|enemy4] // cache line 1
 * []u16(EnemyHp):   [enemy5|enemy6|enemy7|enemy8] // cache line 2
 * []u8(EnemyState): [enemy1|enemy2|enemy3|enemy4|enemy5|enemy6|enemy7|enemy8] // cache line 3
 */
export class EcsManager {
    constructor() {}
}
