/****************** グローバル変数部 ******************/

var origMeibo = ""; //大元の名簿を保管する変数
var mlFlagNum = 1;  //名簿における、メーリスのフラグの値


/****************** 関数部 ******************/

//2分探索によるインデックス探索，c++ lower_bound 参照
function lower_bound(arr,num){

    var first = 0;
    var last  = arr.length - 1
    var middle;
    while (first <= last) {
        middle = 0 | (first + last) / 2;
        if (arr[middle] < num) first = middle + 1;
        else last = middle - 1;
    }
    return first;
}

// startAge期からlastAge期までを検索した際の，配列インデックスを返す
function search_arr(arrDim2, startAge,lastAge){

    var ageColumnIdx = arrDim2[0].findIndex(x => x==="期");//期のある列のインデックスを取得
    var arrTmp       = arrDim2.slice(1,arrDim2.length);
    var searchArr    = arrTmp.map(arr => arr[ageColumnIdx]); //期の列のみ取得

    var startIdx = lower_bound(searchArr,startAge);
    var lastIdx  = lower_bound(searchArr,lastAge+1);

    return [startIdx+1,lastIdx+1];
}

// 2次元配列を，csv形式として出力する
function export_csv(arrDim2,fileName){

    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    var data  = arrDim2.map(arr => arr.join(","));
    data      = data.join("\n");

    var blob = new Blob([bom, data], { type: 'text/csv' });
    let url  = (window.URL || window.webkitURL).createObjectURL(blob);
    let link = document.createElement('a');
    link.download = fileName;
    link.href     = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// startAgeからlastAgeまでをcsvでexportする
function meibo_exporter(data,startAge,lastAge,exportFileName){

    var startIdx,lastIdx;
    [startIdx,lastIdx] = search_arr(data,parseInt(startAge),parseInt(lastAge));
    var exportData = origMeibo.slice(startIdx,lastIdx);            
    exportData.unshift(origMeibo[0]);
    export_csv(exportData,exportFileName);
    var addLog = startAge + "期 から " + lastAge + "期 までをエクスポートしました\n";
    return addLog;
}

// 入力部：A期からB期まで，で一方にしか入力がなければ，A=Bとする
function one_side_number(startAge,lastAge){

    if (startAge === "" && lastAge !== ""){
        startAge = lastAge;
    }
    else if (startAge !== "" && lastAge === ""){
        lastAge = startAge;
    }
    return [startAge,lastAge];
}

// 数値の入力が正しいか判定する、エラー処理。
function input_age_error_check(startAge,lastAge){
    
    var isCorrectInput = false;
    if (isNaN(startAge) || isNaN(lastAge)){
        alert("半角数字で入力してください")
    }
    else{
        startAge = parseInt(startAge);
        lastAge  = parseInt(lastAge);
         if (lastAge === "" ||startAge ===""){
            alert("値を入力してください");
        }
        else if (startAge >lastAge){
            alert("入力の値は昇順にしてください");
        }                
        else{
            isCorrectInput = true;
        }
    }
    return isCorrectInput;
}

//名簿をimportしたかチェックする
function input_meibo_error(){
    if(origMeibo===""){alert("名簿情報をインポートできていません");}
    return origMeibo==="";
}


/****************** Vue.jsのメイン処理 ******************/

//名簿のロード (ヘッダー部)
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
                var lines   = reader.result.split("\n");
                var lineArr = [];
                var appendCnt = 0;
                for (var i=0;i<lines.length;i++){
                    var tmpLine = lines[i].split(",");

                    //ここ、期のある列がかわったら動かなくなるわ
                    if (tmpLine[2] === ""){
                        continue; //空の行の削除
                    }
                    else{
                        lineArr[appendCnt] = lines[i].split(",");
                        appendCnt ++;
                    }
                }

                lineArr.pop(); //最終行に','が入ってしまうため削除
                origMeibo = lineArr.slice(0,lineArr.length);
                delete lineArr;                
            }
        } 
    }
})

//全体の管理 (タブの選択)
var tab = new Vue({
    el: '#Tab',
    data: {
      isActive:                 '1',//tabの切替
      meiboData:                 [],//作業用名簿データ
      mlMeiboData:               [],//MLデータ
      mlMeiboDif1: ["mail address"], //名簿上は登録されていることになっている (フラグがたっている) が，実際には登録されていない
      mlMeiboDif2: ["mail address"], //名簿上は登録されていない(フラグがたっていない) が，実際には登録されている
      startAge:                  "",
      lastAge:                   "",
      divSelect:                 "",//csv出力時のラジオボタン用変数
      logOutput:                 "",
    },

    methods:{

        //名簿の表示-タブ１ 適切な範囲を名簿から切り出す
        dispMeibo (event){
            if(event && !(input_meibo_error())){
                [this.startAge,this.lastAge] = one_side_number(this.startAge,this.lastAge);
                if (input_age_error_check(this.startAge,this.lastAge)){
                    var startIdx,lastIdx;
                    var tmp = origMeibo.slice(0,origMeibo.length);
                    [startIdx,lastIdx] = search_arr(tmp,parseInt(this.startAge),parseInt(this.lastAge));
                    this.meiboData = origMeibo.slice(startIdx,lastIdx);            
                    this.meiboData.unshift(origMeibo[0]);
                }                
            }
        }, 
        
        //分割名簿の作成 タブ2
        divideMeibo (event){
            if(event && !(input_meibo_error())){
                this.logOutput = "";

                if(this.divSelect === "10"){
                    var searchColumnIdx = origMeibo[0].findIndex(element=>element==="期");
                    var lastAge         = parseInt(origMeibo[origMeibo.length-1][searchColumnIdx]);

                    for (var i=0;i<=parseInt(lastAge/10);i++){
                        var tmp = origMeibo.slice(0,origMeibo.length);
                        var exportFileName = 'meibo_div_' + (10*i+1) + 'to' + 10*(i+1) + '.csv';
                        var addLog = meibo_exporter(tmp,10*i+1,10*(i+1),exportFileName);
                        this.logOutput = this.logOutput + addLog;                        
                    }       
                }
                else if(this.divSelect === "custom"){
                    var tmp = origMeibo.slice(0,origMeibo.length);
                    [this.startAge,this.lastAge] = one_side_number(this.startAge,this.lastAge);    
                    if (input_age_error_check(this.startAge,this.lastAge)){
                        var exportFileName = 'meibo_div_' + this.startAge + 'to' + this.lastAge + '.csv';
                        this.logOutput = meibo_exporter(tmp,this.startAge,this.lastAge,exportFileName);
                    }
                }
                else if(this.divSelect === "custom_each"){
                    [this.startAge,this.lastAge] = one_side_number(this.startAge,this.lastAge);    
                    if (input_age_error_check(this.startAge,this.lastAge)){
                        for (var i=this.startAge;i<=this.lastAge;i++){
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
                this.lastAge = "";
            }
        },

        //タブ3
        //ML名簿の読み込み
        mlCsvLoad (event){
            var loadingData = event.target.files[0];
            var reader      = new FileReader();
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
            if (event && !input_meibo_error()){
                if (this.mlMeiboData===""){
                    alert("ML情報をインポートできていません");
                }
                else{
                    //MLからメールの列のみを抽出して成形
                    var mlAddress = [];
                    for (var tmp of this.mlMeiboData){
                        //入力前後の空白を削除、大文字小文字の判別をしない
                        //アットマークが全角の人がいる場合がある
                        mlAddress.push(tmp[0].trim().toLowerCase());
                    }
                    mlAddress.shift();
                    mlAddress.shift();
                    mlAddress.sort();
                    mlAddressFlag = new Array(mlAddress.length).fill(0);//MLのアドレスが名簿にあったら1

                    //名簿の該当箇所の配列インデックスを探す
                    var searchFlagArr   = ["ML","E-Mail 1","E-Mail 2（古い場合あり）"];
                    var searchColumnIdx = [];
                    for (var tmp of searchFlagArr){
                        searchColumnIdx.push(origMeibo[0].findIndex(x => x===tmp));
                    }
                    
                    //照合作業
                    for (var i=1;i<origMeibo.length;i++){
                        if (origMeibo[i][searchColumnIdx[0]] == mlFlagNum){ 

                            //今の件数だと線形探索で十分だった．遅く感じたら二分探索に切り替えるべき (sortはしてある)
                            var index1 = mlAddress.indexOf(origMeibo[i][searchColumnIdx[1]].trim().toLowerCase());
                            var index2 = mlAddress.indexOf(origMeibo[i][searchColumnIdx[2]].trim().toLowerCase());
                            if(index1===-1 && index2 === -1){
                                this.mlMeiboDif1.push(origMeibo[i][searchColumnIdx[1]]);
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


