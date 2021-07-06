//import { util } from "vue/types/umd";
import {UnionSet,PlainID} from "./util";
// Not optimized, 
export default class AlphaOptimize{

    #data = null;

    #interList=null;

    #pID=null;

    alphaLists=null;

    #classInfo=null;
    #totalWeight=null;
    p=1.0;
    rq=100.0;
    lambda=2.0;

    #initXList(){
        
        let interHelperList = [];
        this.#pID = new PlainID(this.#data);
        let uset = new UnionSet(this.#pID.length);

        //init weight
        this.lineWeight = new Array(this.#data.length);
        this.alphaLists = new Array(this.#data.length);
        this.intersectLists = {};
        for(let i=0;i<this.#data.length;i++)
        {
            this.lineWeight[i] = new Array(this.#data[i].length);
            this.alphaLists[i] = new Array(this.#data[i].length);
            this.lineWeight[i].fill(0);
            this.alphaLists[i].fill(0);
        }

        //init x0 dictionary
        let dic={};
        let totalInd=0;
        for(let line of this.#data)
        {
            for(let point of line)
            {
                let x0=point.x;
                if(!dic.hasOwnProperty(x0))
                {
                    dic[x0]=totalInd;
                    totalInd++;
                }
            }
        }

        // new array for each list
        interHelperList=new Array(totalInd);
        for(let i=0;i<totalInd;i++)
        {
            interHelperList[i]=new Array();
        }

        for(let lineID=0;lineID< this.#data.length;lineID++)
        {
            let line=this.#data[lineID];
            for(let i=0;i<line.length-1;i++)
            {
                let storePos = dic[line[i].x];
                interHelperList[storePos].push({cur:line[i],next:line[i+1],lineID:lineID,pointID:i});
            }
        }

        this.resetWeight();

        let intersectCount=0;
        for(let listInd=0;listInd<totalInd;listInd++)
        {
            let oneList = interHelperList[listInd];
            oneList.sort((a,b)=>(a.cur.y-b.cur.y));
            for(let i=0;i<oneList.length;i++)
            {
                let a = oneList[i];
                for(let j=i+1;j<oneList.length;j++)
                {
                    //judge intersection
                    let b = oneList[j];
                    if(b.next.y<=a.next.y)
                    {
                        let intersectPos = this.#isIntersected(a.cur,a.next,b.cur,b.next);
                        if(intersectPos)
                        {
                            let weight=this.#computeWeight(a,b);
                            //this.lineWeight[listInd][i]+=weight;
                            //this.lineWeight[listInd][j]+=weight;
                            let aind = this.#pID.ind(a.lineID,a.pointID);
                            let bind = this.#pID.ind(b.lineID,b.pointID);
                            uset.union(aind,bind);
                            let tmp=this.#genLineIDPair(a.lineID,b.line);
                            /*
                            if(!this.intersectLists.hasOwnProperty(tmp))
                            {
                                this.intersectLists[tmp]=new Array();
                            }
                            this.intersectLists[tmp].push({a:a,b:b,weight:weight,intPos:intersectPos});*/
                            this.lineWeight[a.lineID][a.pointID]+=weight;
                            this.lineWeight[b.lineID][b.pointID]+=weight;
                            intersectCount++;
                        }
                    }
                }
            }
        }//end all for

        this.#classInfo = uset.generateClassInfo();
        this.#normalizeWeight();
        this.#precomputeWeight();
        console.log("Intersections:"+intersectCount);
        //interHelperList = null; //release memory...?
    }//end func

    /**
    *
    * @param data [line id][point id].x/y
    */
    constructor(data)
    {
        this.#data=data;
        this.lineWeight=[];
        this.intersectLists=[];
        this.alphaLists=[];
        this.#initXList(data);
    }

    #isIntersected(a,b,c,d)
    {
        let denominator = (b.y - a.y)*(d.x - c.x) - (a.x - b.x)*(c.y - d.y);  
        if (denominator==0) {  
            return false;  
        }  
      
        let x = ( (b.x - a.x) * (d.x - c.x) * (c.y - a.y)   
                + (b.y - a.y) * (d.x - c.x) * a.x   
                - (d.y - c.y) * (b.x - a.x) * c.x ) / denominator ;  
        let y = -( (b.y - a.y) * (d.y - c.y) * (c.x - a.x)   
                + (b.x - a.x) * (d.y - c.y) * a.y   
                - (d.x - c.x) * (b.y - a.y) * c.y ) / denominator;  
  
        if ((x - a.x) * (x - b.x) <= 0 && (y - a.y) * (y - b.y) <= 0  
             && (x - c.x) * (x - d.x) <= 0 && (y - c.y) * (y - d.y) <= 0  ){
            return { x :  x,  y :  y}  
        } 
        return false;
    }

    #computeWeight(a,b)
    {
        let veca={x:a.next.x-a.cur.x,y:a.next.y-a.cur.y};
        let vecb={x:b.next.x-b.cur.x,y:b.next.y-b.cur.y};
        let cosine = (veca.x*vecb.x+veca.y*vecb.y)/(Math.sqrt(veca.x*veca.x+veca.y*veca.y)*Math.sqrt(vecb.x*vecb.x+vecb.y*vecb.y));
        return Math.abs(cosine);
    }

    resetWeight()
    {
        for(let i=0;i<this.#data.length;i++)
        {
            this.lineWeight[i].fill(0);
        }
    }

    #genLineIDPair(a,b)
    {
        if(a>b)
        {
            return [b,a];
        }
        return [a,b];
    }

    

    // mapping to 0~1, use z-score
    #normalizeWeight()
    {
        let maxv = this.lineWeight[0][0];
        let minv = this.lineWeight[0][0];
        for(let i=0;i<this.#data.length;i++)
        {
            for(let j=0;j<this.lineWeight[i].length;j++)
            {
                maxv = Math.max(this.lineWeight[i][j],maxv);
                minv = Math.min(this.lineWeight[i][j],minv);
            }
        }

        let factor = 1.0/(maxv-minv);
        for(let i=0;i<this.#data.length;i++)
        {
            for(let j=0;j<this.lineWeight[i].length;j++)
            {
                this.lineWeight[i][j] = (this.lineWeight[i][j]-minv)*factor;
            }
        }

        
    }

    #precomputeWeight()
    {
        this.#totalWeight = new Array(this.#classInfo.classCount);
        this.#totalWeight.fill(0);

        for(let i=0;i<this.#data.length;i++)
        {
            for(let j=0;j<this.lineWeight[i].length;j++)
            {
                let id1d = this.#pID.ind(i,j);
                let w = this.lineWeight[i][j];
                this.#totalWeight[this.#classInfo.elementClass[id1d]]+=w*w;
            }
        }
    }
    //TODO: use cache
    /*
    emphasizeLines(lines)
    {
        this.#sumupWeight();
        for(let lineID of lines)
        {
            let curLine = this.lineWeight[lineID];
            for(let i=0;i<curLine.length;i++)
            {
                curLine[i]+=100.0;
            }
        }
        this.#normalizeWeight();
    }*/
/*
    #sumupWeight()
    {
        this.resetWeight();
        for(let key in this.intersectLists)
        {
            let list=this.intersectLists[key];
            for(let v of list)
            {
                this.lineWeight[v.a.lineID][v.a.pointID]+=v.weight;
                this.lineWeight[v.b.lineID][v.b.pointID]+=v.weight;
            }
        }
    }
*/
    //TODO: fade effect
    computeAlphaLists()
    {
        //compute total value
        

        //compute alpha
        for(let i=0;i<this.#data.length;i++)
        {
            for(let j=0;j<this.lineWeight[i].length;j++)
            {
                let id1d = this.#pID.ind(i,j);
                let w = this.lineWeight[i][j];
                let setType=this.#classInfo.elementClass[id1d];
                this.alphaLists[i][j]=this.p/(this.p+Math.pow(1-w,2*this.lambda)*(this.#totalWeight[setType]-w*w)*this.rq);
                //this.alphaLists[i][j]=Math.floor(this.alphaLists[i][j]*256);//+128;
                //this.alphaLists[i][j]=this.p;
            }
        }

        //smooth alpha
        /*
        for(let i=0;i<this.#data.length;i++)
        {
            let tempArray = new Array(this.lineWeight[i].length);
            tempArray[0]=this.alphaLists[i][0];
            for(let j=1;j<this.lineWeight[i].length-1;j++)
            {
                //gaussian filter
                tempArray[j]=(this.alphaLists[i][j-1]+this.alphaLists[i][j]*2+this.alphaLists[i][j+1])*0.25;
            }
            tempArray[this.lineWeight[i].length-1]=this.alphaLists[i][this.lineWeight[i].length-1];
            this.alphaLists[i]=tempArray;
        }*/

        console.log(this.lineWeight[0]);
        console.log(this.alphaLists[0]);
        console.log("lam:"+this.lambda+" P:"+this.p+" rq:"+this.rq);
    }
}

//export{AlphaOptimize}