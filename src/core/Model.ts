namespace core {
    export const MAX_COL = 11;          // 每行最大的泡泡数
    export const MAX_ROW = 15;          // 每列最大的泡泡数
    
    export const B0 = [ 21, 21, 21, 21, 21, 21, 21, 21, 21, 21 ];       // -1层泡泡
    
    // 过滤类型
    export enum EFilterType {
        EMPTY,
        FILLED,
        NONE = 0xf
    }
    
    // 数据索引
    export interface INodeIndex {
        row: number;
        col: number;
    }
    
    export class NodeType {static NONE = 0x00;}
    
    // 节点周围六个方向 从左上开始，顺时针
    // 偶数行
    const D0 = [ [ -1, -1 ], [ -1, 0 ], [ 0, 1 ], [ 1, 0 ], [ 1, -1 ], [ 0, -1 ] ];
    // 奇数行
    const D1 = [ [ -1, 0 ], [ -1, 1 ], [ 0, 1 ], [ 1, 1 ], [ 1, 0 ], [ 0, -1 ] ];
    
    /**
     * 对关卡数据进行处理
     */
    class Model {
        private static _instance: Model;
        static getIns (): Model {
            if( !this._instance )
                this._instance = new Model();
            return this._instance;
        }
        
        private _map: any[][]   = [];          // 地图数据
        private _rows: number   = 0;           // 地图行数
        private _cols: number   = 0;           // 地图列数
        private _maxRow: number = 0;           // 存在节点的最大行数
        // private _visited: number[][] = [];  // 遍历状态
        private _next: number[]  = [];        // 缓存数据组
        private _types: number[] = [];        // 缓存节点种类
        
        // private _curNode: NodeType  = NodeType.NONE;   // 当前节点
        // private _nextNode: NodeType = NodeType.NONE;  // 下一个节点
        
        // 更新地图
        setMap ( map: any[][], types?: any[], next?: any[] ): void {
            // 验证
            let rows = map.length;
            let cols = map[ 0 ] ? map[ 0 ].length : 0;
            if( rows <= 0 || cols <= 0 ) {
                console.warn( '传入了不合法的地图数据！！！' );
                // return;
            }
            this._rows       = rows;
            this._cols       = cols;
            this._map.length = 0;
            this._map        = map;
            this._maxRow     = this._countMaxRow();
            this.setTypes( types );
            this.setNext( next );
        }
        // 获取最底层节点的行坐标
        private _countMaxRow (): number {
            let row  = this._rows - 1;
            let cols = this._cols;
            let map  = this._map;
            while( row >= 0 ) {
                for( let col = 0; col < cols - row % 2; col++ ) {
                    if( map[ row ] && map[ row ][ col ] != NodeType.NONE ) {
                        this._maxRow = row;
                        return row;
                    }
                }
                row--;
            }
        }
        // 解析地图元素种类
        private _alzTypes (): void {
            let map   = this._map,
                rows  = this._maxRow,
                cols  = this._cols,
                types = this._types;
            for( let row = rows; row >= 0; row-- ) {
                cols = this.getCols( row );
                for( let col = 0; col < cols; col++ ) {
                    if( ( map[ row ][ col ] === NodeType.NONE ) ) continue;
                    if( map[ row ][ col ] & 0xf0 ) continue;
                    if( types.indexOf( map[ row ][ col ] ) >= 0 ) continue;
                    types.push( map[ row ][ col ] );
                }
            }
            
            
        }
        
        // 设置type
        setTypes ( value: any[] ): void {
            this._types.length = 0;
            if( !value ) {
                this._alzTypes();
            } else {
                this._types = JSON.parse( JSON.stringify( value ) );
            }
        }
        
        // 设置next
        setNext ( value: any[] ): void {
            this._next.length = 0;
            if( !value ) {
                this._next.length = 0;
            } else {
                this._next = JSON.parse( JSON.stringify( value ) );
            }
        }
        
        /** ------------- ------------------- 数据模型的操作 ------------------------------ */
        // // 获取地图数据
        getMap (): number[][] { return this._map; }
        // 是否为空
        isEmpty (): boolean {
            let maxRow = this._maxRow;
            let map    = this._map;
            let cols   = this._cols;
            if( maxRow > 0 ) return false;
            for( let col = 0; col < cols - maxRow % 2; col++ ) {
                if( map[ maxRow ][ col ] !== NodeType.NONE ) return false;
            }
            return true;
        }
        // 是否溢出
        isOverflow (): boolean {
            let maxRow = this._maxRow;
            return maxRow >= MAX_ROW;
        }
        // 获取行数
        getRows () { return this._rows; }
        // 获取列数
        getCols ( row?: number ) { return ( this._map[ row ] && this._map[ row ].length ) || this._cols; }
        // 获取存在节点的最大行
        getMaxRow (): number { return this._maxRow; }
        
        // 获取节点数据
        getNodeVal ( row: number, col: number ): number { return this._map[ row ][ col ]; }
        // 获取下一个节点
        getNextVal (): number {
            if( this._next.length <= 0 )
                return this.createNode();
            return this._next.pop();
        }
        
        // 添加节点
        addNode ( row: number, col: number, value: NodeType ): void {
            if( !this._checkArea( row, col ) ) return;
            // 更新最低行
            if( row > this._maxRow )
                this._maxRow = row;
            // 更新地图
            if( !this._map[ row ] ) {
                this._map[ row ] = utils.Fill( [], NodeType.NONE, 0, this._cols - row % 2 );
                this._rows++;
            }
            
            // 添加节点
            this._map[ row ][ col ] = value;
        }
        // 移除节点
        removeNodes ( removeNode: INodeIndex[] ): void {
            let self = this;
            for( let i = 0; i < removeNode.length; i++ ) {
                if( removeNode[ i ].row < 0 ) continue;
                self._map[ removeNode[ i ].row ][ removeNode[ i ].col ] = NodeType.NONE;
            }
            // 更新最低行
            this._maxRow = this._countMaxRow();
        }
        // 获取一组节点类型
        getTypes ( nodes: INodeIndex[] ): number[] {
            let types = [];
            let map   = this._map;
            for( let i = 0; i < nodes.length; i++ ) {
                if( types.indexOf( map[ nodes[ i ].row ][ nodes[ i ].col ] ) < 0 )
                    types.push( map[ nodes[ i ].row ][ nodes[ i ].col ] )
            }
            return types;
        }
        
        // todo: 生成一个节点数据  可能根据什么规则来生成，这个后面再设置
        createNode ( rule?: any ): any {
            let randomIndex = Math.floor( Math.random() * this._types.length )
            return this._types[ randomIndex ];
        }
        
        /** ------------- ------------------- 核心算法 ------------------------------ */
        // 获取一个节点周围的节点
        getNeighbors ( centerRow: number, centerCol: number, filterType: EFilterType = EFilterType.NONE ): INodeIndex[] {
            let self      = this;
            let neighbors = [],
                row       = -1,
                col       = -1,
                D         = centerRow % 2 ? D1 : D0;    // 方向
            
            // 验证
            // if( !self._checkArea( centerRow, centerCol ) ) return neighbors;
            
            for( let i = 0; i < D.length; i++ ) {
                row = centerRow + D[ i ][ 0 ];
                col = centerCol + D[ i ][ 1 ];
                
                if( !self._checkArea( row, col ) ) continue;
                
                neighbors.push( { row, col } );
            }
            // 过滤
            if( filterType == EFilterType.EMPTY )
                neighbors = neighbors.filter( ( { row, col } ) => ( !self._map[ row ] || self._map[ row ][ col ] === NodeType.NONE ) );
            else if( filterType == EFilterType.FILLED )
                neighbors = neighbors.filter( ( { row, col } ) => ( self._map[ row ] && self._map[ row ][ col ] !== NodeType.NONE ) )
            
            return neighbors;
        }
        
        /**
         * 以row，col为起点 相同类型的节点的连续数
         * @param {number} row
         * @param {number} col
         * @param {core.NodeType[]} types
         * @returns { [ type: number ]: INodeIndex[] }
         */
        getCombos ( row: number, col: number, types?: NodeType[] ): any {
            // 验证
            if( !this._checkArea( row, col ) ) {
                return {};
            }
            if( !types || !types.length ) {
                types = [ this._map[ row ][ col ] ];
            }
            
            let self                                          = this;
            let map                                           = self._map;
            let visitedMap                                    = self._createMapModel(), // 访问表
                combos: INodeIndex[]                          = [],                     // 类型类型节点集合
                combosMap: { [ type: number ]: INodeIndex[] } = {},                     // 连续类型节点映射
                stack: INodeIndex[]                           = [];                     // 访问栈
            
            let curType: any,
                curNode: INodeIndex,                // 当前访问的节点
                nextNode: INodeIndex,               // 下一个访问的节点
                neighbors: INodeIndex[];            // 访问节点的周边节点
            
            while( types.length ) {
                curType = types.pop();
                
                combos = [ { row, col } ];
                stack.push( { row, col } );
                visitedMap[ row ][ col ] = 1;
                while( stack.length ) {
                    curNode   = stack.pop();
                    neighbors = self.getNeighbors( curNode.row, curNode.col, EFilterType.FILLED );
                    for( let i = 0; i < neighbors.length; i++ ) {
                        nextNode = neighbors[ i ];
                        if( visitedMap[ nextNode.row ][ nextNode.col ] ) continue;
                        if( curType !== map[ nextNode.row ][ nextNode.col ] ) continue;
                        // 进入访问栈
                        stack.push( nextNode );
                        // 连击标记
                        combos.push( nextNode );
                        // 访问标记
                        visitedMap[ nextNode.row ][ nextNode.col ] = 1;
                    }
                }
                combosMap[ curType ] = combos;
            }
            
            return combosMap;
        }
        
        // 获取悬挂的节点
        getConnectedNode ( ignoreIndex?: INodeIndex[] ): number[][] {
            let self                    = this;
            let visitedMap              = self._createMapModel( ignoreIndex ),
                stack: INodeIndex[]     = [],
                curNode: INodeIndex     = null,// 当前访问的节点
                nextNode: INodeIndex    = null,// 下一个访问的节点
                neighbors: INodeIndex[] = null;         // 访问节点的周边节点
            
            let row = 0;
            let col = 0;
            for( ; col < self._cols; col++ ) {
                if( visitedMap[ 0 ][ col ] ) continue;
                if( !self._map[ 0 ][ col ] || self._map[ 0 ][ col ] === NodeType.NONE ) continue;
                
                stack.push( { row, col } );
                visitedMap[ row ][ col ] = 1;
                
                while( stack.length ) {
                    curNode   = stack.pop();
                    neighbors = self.getNeighbors( curNode.row, curNode.col, EFilterType.FILLED );
                    
                    for( let i = 0; i < neighbors.length; i++ ) {
                        nextNode = neighbors[ i ];
                        if( visitedMap[ nextNode.row ][ nextNode.col ] ) continue;
                        
                        stack.push( nextNode );
                        visitedMap[ nextNode.row ][ nextNode.col ] = 1;
                    }
                }
            }
            return visitedMap;
        }
        
        // 获取没有悬挂的节点
        getNoConnectNode ( ignoreIndex?: INodeIndex[] ): INodeIndex[] {
            let self = this,
                rows = self._maxRow,
                cols = self._cols;
            
            let noConnectNodes = [];
            let connectNodes   = this.getConnectedNode( ignoreIndex );
            
            for( let row = rows; row >= 0; row-- ) {
                cols = self.getCols( row );
                for( let col = 0; col < cols; col++ ) {
                    if( connectNodes[ row ][ col ] || self._map[ row ][ col ] === NodeType.NONE ) continue;
                    
                    noConnectNodes.push( { row, col } );
                }
            }
            return noConnectNodes;
        }
        
        // 检查位置是否合法 偶数行比奇数行多一列
        private _checkArea ( row: number, col: number ): boolean {
            return !( row < 0 ||
                // row > this._rows ||
                col < 0 ||
                col >= this._cols - row % 2 );
        }
        
        // 创建一个地图模型
        private _createMapModel ( ignoreIndex?: INodeIndex[] ): number[][] {
            let mapModel = [],
                rows     = this._maxRow,
                cols     = this._cols;
            
            for( let row = rows; row >= 0; row-- ) {
                mapModel[ row ] = [];
                cols            = this.getCols( row );
                for( let col = 0; col < cols; col++ ) {
                    mapModel[ row ][ col ] = 0;
                }
            }
            
            if( ignoreIndex && ignoreIndex.length ) {
                for( let i = 0; i < ignoreIndex.length; i++ ) {
                    if( ignoreIndex[ i ].row < 0 ) continue;
                    mapModel[ ignoreIndex[ i ].row ][ ignoreIndex[ i ].col ] = 1;
                }
            }
            
            return mapModel;
        }
    }
    
    export const model: Model = new Model();
}