var orig_meibo = "";
var ml_flag_num = 2;

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

// A期からB期までを検索した際の，配列インデックスを返す
function search_arr(arr_2dim, startPoint,endPoint){
    var searchCol = arr_2dim[0].findIndex(x => x==="期");
    var arrTmp = arr_2dim.slice(1,arr_2dim.length);
    var searchArr = arrTmp.map(arr => arr[searchCol]); 
    var startIdx = lower_bound(searchArr,startPoint);
    var endIdx = lower_bound(searchArr,endPoint+1);
    return [startIdx+1,endIdx+1];
}

// 2次元配列を，csv形式として出力する
function export_csv(arr_2dim,fileName){
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    var data = arr_2dim.map(arr => arr.join(","));
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
function meibo_exporter(data,startAge,endAge,export_name){
    var startIdx,endIdx;
    [startIdx,endIdx] = search_arr(data,parseInt(startAge),parseInt(endAge));
    var export_data = orig_meibo.slice(startIdx,endIdx);            
    export_data.unshift(orig_meibo[0]);
    export_csv(export_data,export_name);
    var addLog = startAge + "期 から " + endAge + "期 までをエクスポートしました\n";
    return addLog;
}

// A期からB期まで，で一方にしか入力がなければ，A=Bとする
function oneSide_number(startAge,endAge){
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
    var ret_bool = false;
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
            ret_bool = true;
        }
    }

    return ret_bool;
}

//名簿をimportしたかチェックする
function meibo_input_error(){
    if(orig_meibo===""){alert("名簿情報をインポートできていません");}
    return orig_meibo==="";
}

//名簿のロード
var meibo = new Vue({
    el: '#Header',
    data:{
        message: "",
    },
    methods:{
        csv_load: function(event){
            var original_data = event.target.files[0];
            var reader = new FileReader();
            reader.readAsText(original_data,'shift-jis');
            reader.onload = () => {
                var lines = reader.result.split("\n");
                var lineArr = [];

                var append_cnt = 0;
                for (var i=0;i<lines.length;i++){
                    var tmp_line = lines[i].split(",");
                    if (tmp_line[2] === ""){//期
                        continue; //空の行の削除
                    }
                    else{
                        lineArr[append_cnt] = lines[i].split(",");
                        append_cnt ++;
                    }
                }
                lineArr.pop();//最終行に','が入ってしまうため
                orig_meibo = lineArr.slice(0,lineArr.length);
                update_meibo = lineArr.slice(0,lineArr.length);
                delete lineArr;                
            }
        } 
    }
})

//全体の管理 (タブ部)
var tab = new Vue({
    el: '#Tab',
    data: {
      isActive: '1',
      meibo_data:[],
      ml_meibo_data:[],
      ml_meibo_dif1:["mail address"], //名簿上は登録されていることになっている (フラグがたっている) が，実際には登録されていない
      ml_meibo_dif2:["mail address"], //名簿上は登録されていない(フラグがたっていない) が，実際には登録されている
      startAge:"",
      endAge:"",
      divSelect:"",
      logOutput:"",
    },

    methods:{
        //名簿の表示 タブ１ 適切な範囲を名簿から切り出す
        dispMeibo (event){
            if(event && !(meibo_input_error())){
                [this.startAge,this.endAge] = oneSide_number(this.startAge,this.endAge);
                if (number_error_back(this.startAge,this.endAge)){
                    var startIdx,endIdx;
                    var tmp = orig_meibo.slice(0,orig_meibo.length);
                    [startIdx,endIdx] = search_arr(tmp,parseInt(this.startAge),parseInt(this.endAge));
                    this.meibo_data = orig_meibo.slice(startIdx,endIdx);            
                    this.meibo_data.unshift(orig_meibo[0]);
                }                
            }
        }, 
        //分割名簿の作成 タブ2
        divideMeibo (event){
            if(event && !(meibo_input_error())){
                this.logOutput = "";
                if (orig_meibo===""){
                    alert("名簿情報をインポートできていません");
                    return;
                }
                if(this.divSelect === "10"){
                    var searchCol = orig_meibo[0].findIndex(element=>element==="期");
                    var endAge = parseInt(orig_meibo[orig_meibo.length-1][searchCol]);
                    for (var i=0;i<=parseInt(endAge/10);i++){
                        var tmp = orig_meibo.slice(0,orig_meibo.length);
                        var export_name = 'meibo_div_' + (10*i+1) + 'to' + 10*(i+1) + '.csv';
                        var addLog = meibo_exporter(tmp,10*i+1,10*(i+1),export_name);
                        this.logOutput = this.logOutput + addLog;                        
                    }       
                }
                else if(this.divSelect === "custom"){
                    var tmp = orig_meibo.slice(0,orig_meibo.length);
                    [this.startAge,this.endAge] = oneSide_number(this.startAge,this.endAge);    
                    if (number_error_back(this.startAge,this.endAge)){
                        var export_name = 'meibo_div_' + this.startAge + 'to' + this.endAge + '.csv';
                        this.logOutput = meibo_exporter(tmp,this.startAge,this.endAge,export_name);
                    }
                }
                else if(this.divSelect === "custom_each"){
                    [this.startAge,this.endAge] = oneSide_number(this.startAge,this.endAge);    
                    if (number_error_back(this.startAge,this.endAge)){
                        for (var i=this.startAge;i<=this.endAge;i++){
                            var export_name = 'meibo_div_' + i + 'to' + i + '.csv';
                            var tmp = orig_meibo.slice(0,orig_meibo.length);
                            var addLog = meibo_exporter(tmp,i,i,export_name);
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
        mlCsvLoad (event){
            var load_data = event.target.files[0];
            var reader = new FileReader();
            reader.readAsText(load_data,'UTF-8');
            reader.onload = () => {
                var lines = reader.result.split("\n");
                var lineArr = [];
                var append_cnt = 0;
                for (var i=1;i<lines.length;i++){
                    lineArr[append_cnt] = lines[i].split(",");
                    append_cnt ++;
                }
                lineArr.unshift(lines[0].split(","));
                this.ml_meibo_data = lineArr;
            }    
        },
        mlCsvDisp(event){
            if (this.ml_meibo_data===""){
                alert("ML名簿情報をインポートできていません");
            }
            else{
                var ml_address = [];
                for (var tmp of this.ml_meibo_data){
                    ml_address.push(tmp[0].trim().toLowerCase());
                }
                ml_address.shift();
                ml_address.shift();
                ml_address.sort();
                ml_address_flag = new Array(ml_address.length).fill(0);

                var search_flag = ["ML","E-Mail 1","E-Mail 2（古い場合あり）"];
                var searchCol = [];
                for (var tmp of search_flag){
                    searchCol.push(orig_meibo[0].findIndex(x => x===tmp));
                }

                for (var i=1;i<orig_meibo.length;i++){
                    if (orig_meibo[i][searchCol[0]] == ml_flag_num){ 
                        var index1 = ml_address.indexOf(orig_meibo[i][searchCol[1]].trim().toLowerCase());
                        var index2 = ml_address.indexOf(orig_meibo[i][searchCol[2]].trim().toLowerCase());
                        if(index1===-1 && index2 === -1){
                            this.ml_meibo_dif1.push(orig_meibo[i][searchCol[1]]);
                        }
                        else{
                            if (index1 !==-1) ml_address_flag[index1] = 1;
                            if (index2 !==-1) ml_address_flag[index2] = 1;
                        }
                    }
                }
                for (var i=0;i<ml_address.length;i++){
                    if(ml_address_flag[i] !== 1) this.ml_meibo_dif2.push(ml_address[i]);
                }
            }
        }
    }
})


