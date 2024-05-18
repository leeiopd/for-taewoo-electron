const xlsx = require("xlsx");
const { ipcRenderer } = require("electron");

const API_URL =
  "https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=";

const fileUploadButton = document.getElementById("fileUpload");
const saveDataButton = document.getElementById("downloadExcel");

// 키보드 입력
document.addEventListener("keydown", (event) => {
  if (event.keyCode == 123) {
    //F12
    //메인프로세스로 toggle-debug 메시지 전송 (디버그 툴 토글시켜라)
    ipcRenderer.send("toggle-debug", "an-argument");
  } else if (event.keyCode == 116) {
    //F5
    //메인프로세스로 refresh 메시지 전송 (페이지를 갱신시켜라)
    ipcRenderer.send("refresh", "an-argument");
  }
});

try {
  let resultExcelData;

  fileUploadButton.addEventListener("change", async () => {
    const file = fileUploadButton.files[0];
    if (file) {
      await xlsxService(file);
    }
  });

  saveDataButton.addEventListener("click", async () => {
    // resultExcelData 를 엑셀 파일로 변환하여 다운로드
    if (!resultExcelData) return;
    // 만들어지는 엑셀 파일의 컬럼 순서를 정의
    // 엑셀 파일의 헤더로 사용됨
    const header = ["사업자등록번호", "사업자상태", "폐업일자", "service_key"];
    // resultExcelData 의 데이터를 엑셀 파일로 변환

    const reorderedData = resultExcelData.map((obj) => {
      return header.reduce((newObj, key) => {
        newObj[key] = obj[key];
        return newObj;
      }, {});
    });

    const ws = xlsx.utils.json_to_sheet(reorderedData, header);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
    const wbout = xlsx.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "result.xlsx";
    link.click();
    window.URL.revokeObjectURL(url);
  });

  const xlsxService = async (file) => {
    const data = await getExcelData(file);

    const serviceKey = data[0]["service_key"];
    const resultData = await getData({ data, serviceKey });

    // data 와 resultData 를 비교하여 같은 b_no 를 찾아 resultData 의 데이터를 data 에 추가하는 로직
    data.forEach((item) => {
      const resultItem = resultData.find(
        (resultItem) => resultItem.b_no === item["사업자등록번호"].toString()
      );
      if (resultItem) {
        item["사업자상태"] = resultItem.b_stt;
        item["폐업일자"] = resultItem.end_dt;
      }
    });

    resultExcelData = data;
    saveDataButton.removeAttribute("disabled");
  };

  const getExcelData = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = xlsx.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json(sheet);
        resolve(jsonData);
      };
      reader.onerror = (e) => {
        reject(e);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const getData = async ({ data, serviceKey }) => {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    const b_no = data.map((item) => {
      const b_no = item["사업자등록번호"].toString();

      return b_no.replace(/[^0-9]/g, "");
    });

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: JSON.stringify({ b_no }),
      redirect: "follow",
    };

    const result = await fetch(`${API_URL}${serviceKey}`, requestOptions)
      .then((response) => response.text())
      .then((result) => JSON.parse(result))
      .catch((error) => {
        throw new Error(error);
      });

    return result.data;
  };
} catch (error) {
  alert(`에러가 발생했습니다.\n${error}`);

  console.log(error);
}
