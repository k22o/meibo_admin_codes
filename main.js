var origMeibo = "";
var mlFlagNum = 2;

//2分探索によるインデックス探索，c++ lower_bound 参照
function lower_bound(arr,num){
    var first = 0;
    var last = arr.length - 1
    var middle;
    while (first <= last) {
        middle = 0 | (first + last) / 2;
        if (arr[middle] < num) first = middle + 1;
        else last = middle - 1;
    }
    return first;
}

// startPoint期からendPoint期までを検索した際の，配列インデックスを返す
function search_arr(arrDim2, startPoint,endPoint){
    var searchCol = arrDim2[0].findIndex(x => x==="期");
    var arrTmp = arrDim2.slice(1,arrDim2.length);
    var searchArr = arrTmp.map(arr => arr[searchCol]); 
    var startIdx = lower_bound(searchArr,startPoint);
    var endIdx = lower_bound(searchArr,endPoint+1);
    return [startIdx+1,endIdx+1];
}

// 2次元配列を，csv形式として出力する
function export_csv(arrDim2,fileName){
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    var data = arrDim2.map(arr => arr.join(","));
    data = data.join("\n");
    var blob = new Blob([bom, data], { type: 'text/csv' });
    let url = (window.URL || window.webkitURL).createObjectURL(blob);
    let link = document.createElement('a');
    link.download = fileName;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// startAgeからendAgeまでをcsvでexportする
function meibo_exporter(data,startAge,endAge,exportFileName){
    var startIdx,endIdx;
    [startIdx,endIdx] = search_arr(data,parseInt(startAge),parseInt(endAge));
    var exportData = origMeibo.slice(startIdx,endIdx);            
    exportData.unshift(origMeibo[0]);
    export_csv(exportData,exportFileName);
    var addLog = startAge + "期 から " + endAge + "期 までをエクスポートしました\n";
    return addLog;
}

// A期からB期まで，で一方にしか入力がなければ，A=Bとする
function one_side_number(startAge,endAge){
    if (startAge === "" && endAge !== ""){
        startAge = endAge;
    }
    else if (startAge !== "" && endAge === ""){
        endAge = startAge;
    }
    return [startAge,endAge];
}

// 数値の入力が正しいか判定する
function number_error_back (startAge,endAge){
    var returnBool = false;
    if (isNaN(startAge) || isNaN(endAge)){
        alert("半角数字で入力してください")
    }
    else{
        startAge = parseInt(startAge);
        endAge = parseInt(endAge);
         if (endAge === "" ||startAge ===""){
            alert("値を入力してください");
        }
        else if (startAge >endAge){
            alert("入力の値は昇順にしてください");
        }                
        else{
            returnBool = true;
        }
    }
    return returnBool;
}

//名簿をimportしたかチェックする
function meibo_input_error(){
    if(origMeibo===""){alert("名簿情報をインポートできていません");}
    return origMeibo==="";
}

//名簿のロード
var meibo = new Vue({
    el: '#Header',
    data:{
        message: "",
    },
    methods:{
        csv_load: function(event){
            var firstLoadData = event.target.files[0];
            var reader = new FileReader();
            reader.readAsText(firstLoadData,'shift-jis');
            reader.onload = () => {
                var lines = reader.result.split("\n");
                var lineArr = [];

                var appendCnt = 0;
                for (var i=0;i<lines.length;i++){
                    var tmpLine = lines[i].split(",");
                    if (tmpLine[2] === ""){//期
                        continue; //空の行の削除
                    }
                    else{
                        lineArr[appendCnt] = lines[i].split(",");
                        appendCnt ++;
                    }
                }
                lineArr.pop();//最終行に','が入ってしまうため
                origMeibo = lineArr.slice(0,lineArr.length);
                delete lineArr;                
            }
        } 
    }
})

//全体の管理 (タブ部)
var tab = new Vue({
    el: '#Tab',
    data: {
      isActive: '1',//tabの切替
      meiboData:[],//作業用名簿データ
      mlMeiboData:[],//MLデータ
      mlMeiboDif1:["mail address"], //名簿上は登録されていることになっている (フラグがたっている) が，実際には登録されていない
      mlMeiboDif2:["mail address"], //名簿上は登録されていない(フラグがたっていない) が，実際には登録されている
      startAge:"",
      endAge:"",
      divSelect:"",//csv出力時のラジオボタン用変数
      logOutput:"",
    },

    methods:{
        //名簿の表示 タブ１ 適切な範囲を名簿から切り出す
        dispMeibo (event){
            if(event && !(meibo_input_error())){
                [this.startAge,this.endAge] = one_side_number(this.startAge,this.endAge);
                if (number_error_back(this.startAge,this.endAge)){
                    var startIdx,endIdx;
                    var tmp = origMeibo.slice(0,origMeibo.length);
                    [startIdx,endIdx] = search_arr(tmp,parseInt(this.startAge),parseInt(this.endAge));
                    this.meiboData = origMeibo.slice(startIdx,endIdx);            
                    this.meiboData.unshift(origMeibo[0]);
                }                
            }
        }, 
        
        //分割名簿の作成 タブ2
        divideMeibo (event){
            if(event && !(meibo_input_error())){
                this.logOutput = "";
                if(this.divSelect === "10"){
                    var searchCol = origMeibo[0].findIndex(element=>element==="期");
                    var endAge = parseInt(origMeibo[origMeibo.length-1][searchCol]);
                    for (var i=0;i<=parseInt(endAge/10);i++){
                        var tmp = origMeibo.slice(0,origMeibo.length);
                        var exportFileName = 'meibo_div_' + (10*i+1) + 'to' + 10*(i+1) + '.csv';
                        var addLog = meibo_exporter(tmp,10*i+1,10*(i+1),exportFileName);
                        this.logOutput = this.logOutput + addLog;                        
                    }       
                }
                else if(this.divSelect === "custom"){
                    var tmp = origMeibo.slice(0,origMeibo.length);
                    [this.startAge,this.endAge] = one_side_number(this.startAge,this.endAge);    
                    if (number_error_back(this.startAge,this.endAge)){
                        var exportFileName = 'meibo_div_' + this.startAge + 'to' + this.endAge + '.csv';
                        this.logOutput = meibo_exporter(tmp,this.startAge,this.endAge,exportFileName);
                    }
                }
                else if(this.divSelect === "custom_each"){
                    [this.startAge,this.endAge] = one_side_number(this.startAge,this.endAge);    
                    if (number_error_back(this.startAge,this.endAge)){
                        for (var i=this.startAge;i<=this.endAge;i++){
                            var exportFileName = 'meibo_div_' + i + 'to' + i + '.csv';
                            var tmp = origMeibo.slice(0,origMeibo.length);
                            var addLog = meibo_exporter(tmp,i,i,exportFileName);
                            this.logOutput = this.logOutput + addLog;                            
                        }
                    }
                }
                else{
                    alert("出力形式を選択してください")
                }
                this.startAge = "";
                this.endAge = "";
            }
        },

        //タブ3
        //ML名簿の読み込み
        mlCsvLoad (event){
            var loadingData = event.target.files[0];
            var reader = new FileReader();
            reader.readAsText(loadingData,'UTF-8');
            reader.onload = () => {
                var lines = reader.result.split("\n");
                var lineArr = [];
                var appendCnt = 0;
                for (var i=1;i<lines.length;i++){
                    lineArr[appendCnt] = lines[i].split(",");
                    appendCnt ++;
                }
                lineArr.unshift(lines[0].split(","));
                this.mlMeiboData = lineArr;
            }    
        },
        //照合作業をする
        mlCsvDisp(event){
            if (event && !meibo_input_error()){
                if (this.mlMeiboData===""){
                    alert("ML情報をインポートできていません");
                }
                else{
                    //MLからメールののみを抽出して成形
                    var mlAddress = [];
                    for (var tmp of this.mlMeiboData){
                        mlAddress.push(tmp[0].trim().toLowerCase());
                    }
                    mlAddress.shift();
                    mlAddress.shift();
                    mlAddress.sort();
                    mlAddressFlag = new Array(mlAddress.length).fill(0);//MLのアドレスが名簿にあったら1

                    //名簿の該当箇所の配列インデックスを探す
                    var searchFlagArr = ["ML","E-Mail 1","E-Mail 2（古い場合あり）"];
                    var searchCol = [];
                    for (var tmp of searchFlagArr){
                        searchCol.push(origMeibo[0].findIndex(x => x===tmp));
                    }
                    
                    //照合作業
                    for (var i=1;i<origMeibo.length;i++){
                        if (origMeibo[i][searchCol[0]] == mlFlagNum){ 
                            //今の件数だと線形探索で十分だった．遅く感じたら二分探索に切り替えるべき (sortはしてある)
                            var index1 = mlAddress.indexOf(origMeibo[i][searchCol[1]].trim().toLowerCase());
                            var index2 = mlAddress.indexOf(origMeibo[i][searchCol[2]].trim().toLowerCase());
                            if(index1===-1 && index2 === -1){
                                this.mlMeiboDif1.push(origMeibo[i][searchCol[1]]);
                            }
                            else{
                                if (index1 !==-1) mlAddressFlag[index1] = 1;
                                if (index2 !==-1) mlAddressFlag[index2] = 1;
                            }
                        }
                    }
                    for (var i=0;i<mlAddress.length;i++){
                        if(mlAddressFlag[i] !== 1) this.mlMeiboDif2.push(mlAddress[i]);
                    }
                }
            }
        }
    }
})


