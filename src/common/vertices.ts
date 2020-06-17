import { Vector } from "../math/vector";
import { Bound } from "../collision/bound";
import { Body } from "../body/body";
import { Util } from "./util";

// 顶点列表类型
export type VertexList = Array<Vector>;

// 一个顶点信息包
export class Poly {
    id: number;
    vertexList: VertexList;
    axes: Vector[];
    body: Body;
    bound: Bound;
    isConcave: boolean;
    center: Vector;

    constructor(body: Body, vertexList: VertexList) {
        this.id = Util.id();
        this.body = body;
        this.vertexList = vertexList;
        this.axes = Vertices.getAxes(vertexList);
        this.center = Vertices.getCenter(vertexList);
        this.bound = Vertices.getBound(vertexList);
    }
};




// 顶点操作工具
export const Vertices = {

    /**
     * 创造顶点信息包
     * @param body 顶点所属的刚体
     * @param vertices 顶点集
     */
    create(body: Body, vertexList: VertexList): Poly {
        return new Poly(body, vertexList);
    },

    /**
     * 获取多边形中心点
     * @param vertexList 
     */
    getCenter(vertexList: VertexList): Vector {
        let range = this.getRange(vertexList),
            centerX = (range.max.x + range.min.x) / 2,
            centerY = (range.max.y + range.min.y) / 2;
        
        return new Vector(centerX, centerY);
    },

    /**
     * 获取多边形质心
     * @param vertexList 
     */
    getCentroid(vertexList: VertexList): Vector {
        let area = this.getArea(vertexList),
            centroid = new Vector(0, 0),
            cross = 0,
            temp,
            j;

        for (let i = 0; i < vertexList.length; i++) {
            j = (i + 1) % vertexList.length;
            cross = vertexList[i].cro(vertexList[j]);
            temp = vertexList[i].add(vertexList[j]).scl(cross);
            centroid.add(temp, centroid);
        }

        return centroid.scl(1 / (6 * area), centroid);
    },

    /**
     * 获取多边形面积
     * @param vertexList 
     */
    getArea(vertexList: VertexList): number {
        let area = 0,
            j = vertexList.length - 1;

        for(let i = 0; i < vertexList.length; i++) {
            area += (vertexList[j].x - vertexList[i].x)*(vertexList[j].y + vertexList[i].y);
            j = i;
        }

        return area/2;
    },

    /**
     * 获取多边形的转动惯量
     * 公式来自：https://blog.csdn.net/weixin_34194702/article/details/93587529
     * @param vertexList 
     * @param mass 质量
     * @param position
     */
    getInertia(vertexList: VertexList, mass: number, position: Vector): number {
        let numerator = 0,
            denominator = 0,
            v = vertexList,
            cur, next,
            cross;

        for(let n = 0; n < v.length; n++) {
            cur = v[n].sub(position, cur);
            next = v[(n + 1) % v.length].sub(position, next);

            cross = Math.abs(cur.cro(next));
            numerator += cross * (cur.dot(cur) + cur.dot(next) + next.dot(next));
            denominator += cross;
        }

        return (mass / 6) * (numerator / denominator);
    },

    /**
     * 求顶点围成的所有面的轴
     * @param vertexList 
     */
    getAxes(vertexList: VertexList): Vector[] {
        let v = vertexList,
            axis, axes = [],
            i, j;

            for(i = 0; i < v.length; i++) {
                j = (i + 1) % v.length;
                axis = v[j].sub(v[i]).nor().nol();
                axes.push(axis);
            }

        return axes;
    },  

    /**
     * 获取顶点集的范围
     * @param vertexList 
     */
    getRange(vertexList: VertexList): {min: Vector, max: Vector} {
        let xList = vertexList.map(v => v.x),
            yList = vertexList.map(v => v.y);

        return {
            min: new Vector(Math.min.apply(Math, xList), Math.min.apply(Math, yList)),
            max: new Vector(Math.max.apply(Math, xList), Math.max.apply(Math, yList))
        };
    },
    
    /**
     * 获取顶点集形成的包围盒
     * @param vertexList 
     */
    getBound(vertexList: VertexList): Bound {
        let range = Vertices.getRange(vertexList);
        return new Bound(range.min, range.max);
    },


    /**
     * 使用斜率筛去共线的轴
     * @param axes 要筛选的轴
     */
    uniqueAxes(axes: Vector[]): Vector[] {
        let axis,
            tmpAxes = [],
            axesTable = {},
            i, gradient;

        for (i = 0; i < axes.length; i++) {
            axis = axes[i];
            gradient = (axis.y === 0) ? Infinity : (axis.x / axis.y);
            
            // 限制精度
            gradient = gradient.toFixed(3).toString();
            axesTable[gradient] = axis;
        }

        Object.keys(axesTable).map(item => {
            tmpAxes.push(axesTable[item]);
        });

        return tmpAxes;
    },


    /**
     * 旋转顶点
     * @param poly 多边形 
     * @param radian 弧度
     * @param point 绕点
     */
    rotate(poly: Poly, radian: number, point: Vector) {
        let vertexList = poly.vertexList,
            axes = poly.axes,
            i;
        
        // 转动顶点
        for(i = 0; i < vertexList.length; i++) {
            vertexList[i].rot(radian, point, vertexList[i]);
        }

        // 转动轴
        for(i = 0; i < axes.length; i++) {
            axes[i].rot(radian, null, axes[i]);
        }
        
        // 更新几何中心
        poly.center.rot(radian, point, poly.center);

        // 更新包围盒
        poly.bound.update(poly.vertexList);
    },  

    /**
     * 位移顶点
     * @param poly 多边形 
     * @param distance 位移向量
     */
    translate(poly: Poly, distance: Vector) {
        let v: VertexList = poly.vertexList, i;

        // 位移顶点
        for(i = 0; i < v.length; i++) {
            v[i].x += distance.x;
            v[i].y += distance.y;
        }
        
        poly.center.x += distance.x;
        poly.center.y += distance.y;

        // 位移包围盒
        poly.bound.translate(distance);
    },

    /**
     * 将凹多边形分解为多个子凸多边形
     * @param poly
     */
    divide(poly: Poly): Poly[] {
        // 将拆分出来的多边形保存到这个数组
        let parts = [],
            v = poly.vertexList.slice(0),
            partA: Poly, 
            partB: Poly,
            vertexListA: Vector[], 
            vertexListB: Vector[],
            axes = poly.axes.slice(0),
            axesA: Vector[], 
            axesB: Vector[],
            xAxis: Vector,
            vTest: Vector,
            vDiv: Vector,
            dividePointA: Vector,
            dividePointB: Vector,
            len = v.length, i, j, cur, next, next2, 
            flag = false;

        for(i = 0 ; i < len; i++) {
            cur = i;
            next = (i + 1) % len;
            next2 = (i + 2) % len;

            xAxis = v[next].sub(v[cur]); 
            vTest = v[next2].sub(v[cur]);

            if(xAxis.cro(vTest) < 0) {
                for(j = i + 3; j < len; j++) {
                    vDiv = v[j].sub(v[cur]);
                    if(xAxis.cro(vDiv) > 0) {
                        flag = true;
                        break;
                    }
                }

                if(flag) break;
            }
        }

        // 获取两个分割点
        dividePointA = v[next],
        dividePointB = v[j];

        // 拆分为两个多边形vertexListA和vertexListB
        vertexListB = v.splice(next2, j - next2);
        vertexListA = v;
        vertexListB.unshift(dividePointA);
        vertexListB.push(dividePointB);

        axesB = axes.splice(next, j - next);
        axesA = axes;

        partA = Vertices.create(poly.body, vertexListA);
        partB = Vertices.create(poly.body, vertexListB);
        partA.axes = axesA;
        partB.axes = axesB;

        // 检测拆分出来的两个多边形是否是凹多边形，若果是，继续递归拆分
        if(this.isConcave(vertexListA)) {
            parts.push(...this.divide(partA));
        }
        else {
            parts.push(partA);
        }

        if(this.isConcave(vertexListB)) {
            parts.push(...this.divide(partB));
        }
        else {
            parts.push(partB);
        }

        return parts;
    },

    /**
     * 判断是否包含顶点（射线法）
     * 参考：https://www.cnblogs.com/anningwang/p/7581545.html
     * @param vertexList 
     * @param point 检测的顶点
     */
    isContains(vertexList: VertexList, point: Vector): boolean {
        let v = vertexList,
            i, j, len = vertexList.length, 
            flag = false;

        for(i = 0, j = len - 1; i < len; j = i++) {
            if(v[i].eql(point)) return false;

            if(((v[i].y > point.y) != (v[j].y > point.y)) 
            && (point.x < (v[j].x - v[i].x)*(point.y - v[i].y)/(v[j].y - v[i].y) + v[i].x))
                flag = !flag;
        }

        return flag;
    },

    /**
     * 判断是否为凹多边形
     * @param vertexList 
     */
    isConcave(vertexList: VertexList): boolean {
        let v = vertexList,
            // 上两向量间的叉积
            prevCor, 
            // 当前两向量的叉积
            curCor,
            // 上一顶点到当前顶点的向量
            prev2Cur,
            // 当前顶点到下一顶点的向量
            cur2Next,
            len = v.length, 
            i, j, k;

        for(i = 1; i < len; i++) {
            j = i - 1;
            k = (i + 1)%len;

            prev2Cur = v[i].sub(v[j]);
            cur2Next = v[k].sub(v[i]);

            // 计算向量叉积
            curCor = prev2Cur.cro(cur2Next) >= 0? 1: -1;

            if(prevCor !== undefined && prevCor !== curCor) {
                return true;
            } 
            
            prevCor = curCor;
        }

        return false;
    },

    /**
     * 转换到世界坐标
     * @param point 参考点
     * @param vertexList 
     */
    transform2World(point: Vector, vertexList: VertexList): VertexList {
        return vertexList.map(v => v.add(point, v));
    },

    /**
     * 转换到本地坐标
     * @param point 参考点
     * @param vertexList 
     */
    transform2Local(point: Vector, vertexList: VertexList): VertexList {
        return vertexList.map(v => v.sub(point, v));
    },

    /**
     * 求多边形在某个轴的投影
     * @param vertexList 
     * @param axis 投影轴
     */
    projection(vertexList: VertexList, axis: Vector): {min: number, max: number} {
        let projectionRange = vertexList.map(v => v.pro(axis));

        return {
            min: Math.min.apply(Math, projectionRange),
            max: Math.max.apply(Math, projectionRange)
        };  
    },

    /**
     * 计算顶点集中离给定点最近的顶点
     * @param point 给定点
     * @param vertexList 顶点集
     */
    getClosestVertex(point: Vector, vertexList: VertexList): Vector {
        let v = vertexList,
            i, min = Infinity, length, index,
            len = v.length;

        for(i = 0; i < len; i++) {
            length = v[i].sub(point).len();

            if(length < min) {
                min = length;
                index = i;
            }
        }

        return vertexList[index];
    },

    /**
     * 寻找顶点集中所有凹点
     * @param vertexList 
     */
    findCaves(vertexList: VertexList): Vector[] {
        let caves = [],
            v = vertexList,
            prevVertex,
            curVertex, 
            nextVertex,
            len = v.length,
            i;

        for(i = 1; i < len; i++) {
            prevVertex = v[i - 1];
            curVertex = v[i];
            nextVertex = v[(i + 1) % len];

            // 利用叉乘判断
            if(curVertex.sub(prevVertex).cro(nextVertex.sub(curVertex)) < 0) {
                caves.push(curVertex);
            }
        }

        return caves;
    }
}



