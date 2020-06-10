"use strict";
const headList = [
  {name: "サイト名", className: "site"},
  {name: "URL", className: "URL"},
  {name: "金額", className: "pay"},
  {name: "過去30日間訪問回数", className: "count"},
  {name: "削除", className: "delete"}
];
let subscriptionList = [];

/**
 * ヘッダーの生成をする関数
 * @param {テーブルヘッダー要素のID} tableId 
 * @param {ヘッダーにセットする要素のリスト} headList 
 */
function createTableHead(tableId, headList) {
  const tableHead = document.getElementById(tableId);
  let tr = document.createElement("tr"); 
  for (let i=0; i<headList.length; i++) {
    let th = document.createElement("th");
    th.textContent = headList[i].name;
    th.className = headList[i].className;
    tr.appendChild(th);
  }
  tableHead.appendChild(tr);
}

/**
 * td要素を作成して返す関数
 * @param {td要素の文章} inner 
 * @param {td要素のクラス} className 
 * @param {td要素の中をリンクタグにするか。boolian true=>link tag false=>string} linkBool 
 */
function createTd(inner, className, linkBool) {
  let td = document.createElement("td");
  td.className = className;
  if (linkBool) {
    td.innerHTML = '<a href="' + inner + '">' + inner + '</a>'; 
  } else {
    td.textContent = inner;
  }
  return td;
}

/**
 * 引数に与えられたurlのサイトの訪問回数を取得する。dateの日数分遡ってカウントする。
 * @param {訪問回数を取得するサイトのURL} url 
 * @param {遡る日数} date 
 * @param {非同期通信の反映をするために必要} index
 */
function visitSiteCount(url, date, index) {
  const microsecondsPerDay = 1000 * 60 * 60 * 24;
  const durationOfDay = new Date().getTime() - microsecondsPerDay * date;
  let visitSiteList = [];
  chrome.history.search({
    text: url,
    startTime: durationOfDay,
  }, function(Objects) {
    Objects.forEach(function(Object) {
      chrome.history.getVisits({url: Object.url}, function(visitSiteDatas) {
        visitSiteDatas.forEach(function(visitSite) {
          if(visitSite.visitTime > durationOfDay) {
            visitSiteList.push(visitSite.url);
            let td = document.getElementById("td-count" + index);
            td.textContent = visitSiteList.length;
          }
        });
      })
    });
  });
  return visitSiteList;
}

/**
 * 登録したサイトを表示するテーブルを生成
 * @param {テーブルボディ要素のID} tableId 
 * @param {表示するリストchromeAPIで取得したもの} subList 
 */
function createTableBody(tableId, subList) {
  const tableBody = document.getElementById(tableId);
  let total = 0;
  let index = 0;

  subList.forEach(subscription => {
    let tr = document.createElement("tr");
    // サイト名
    let tdName = createTd(subscription.siteName, "td-text", false);
    tr.appendChild(tdName);
    // サイトURL
    let tdUrl = createTd(subscription.siteUrl, "td-text", true);
    tr.appendChild(tdUrl);
    // サイト金額
    let tdPay = createTd(subscription.sitePay, "td-number", false);
    tr.appendChild(tdPay);
    // 履歴の取得 過去30日間
    let siteList = visitSiteCount(subscription.siteUrl, 30, index);
    let tdCount = createTd("", "td-number", false);
    tdCount.id = "td-count" + index;
    tr.appendChild(tdCount);
    // 削除ボタン
    let tdBtn = document.createElement("td");
    let btn = document.createElement("button");
    btn.textContent = "削除";
    btn.className = "delete-button";
    btn.name = index;
    tdBtn.appendChild(btn);
    tr.appendChild(tdBtn);
    tableBody.appendChild(tr);
    index++;
  });

}

/**
 * 合計金額を返す関数
 * @param {chromeAPIで取得したsubscriptionList} subList 
 */
function calcTotal(subList) {
  let total = 0;
  subList.forEach(function(sub) {
    total += parseInt(sub.sitePay);
  });
  return total
}

document.addEventListener("DOMContentLoaded", function() {
  chrome.storage.local.get(["subscriptionList"], function(items) {
    if (items.subscriptionList) {
      subscriptionList = items.subscriptionList;
    }
    console.log(items.subscriptionList);
    // テーブルヘッドの生成
    createTableHead("table-head", headList);
    // テーブルボディの生成
    createTableBody("table-body", subscriptionList);
    // 合計金額の計算
    document.getElementById("total").textContent = "合計：" + calcTotal(subscriptionList) + "円";

    // 新しいサイトの登録
    document.getElementById("submit").addEventListener("click", function() {
      event.preventDefault(); // ページ遷移の中止
      // 入力項目を変数に代入
      const siteName = document.getElementById("site-name").value;
      const siteUrl = document.getElementById("site-url").value;
      const sitePay = document.getElementById("site-pay").value;
      // 入力チェック
      if (siteName != "" && siteUrl != "" && sitePay != "") {
        // 連想配列に代入
        let subscription = {
          siteName: siteName,
          siteUrl: siteUrl,
          sitePay: sitePay
        }  
        subscriptionList.push(subscription); // 連想配列をサブスク リストに追加
        // ローカルストレージに代入
        chrome.storage.local.set({
          subscriptionList: subscriptionList
        }, () => {
          console.log("save is success!!");
          location.reload(); // ページ遷移
        });
        document.getElementById("message").innerHTML = ""; // メッセージの削除
      } else {
        document.getElementById("message").innerHTML = "入力されていない箇所があります。"; // 未入力があった場合のメッセージ
      }
    });

    // 登録したサイトの削除
    let deleteBtns = document.getElementsByClassName("delete-button");
    for (let i=0; i < deleteBtns.length; i++) {
      deleteBtns[i].addEventListener("click", function() {
        console.log(subscriptionList[i]);
        subscriptionList.splice(i, 1);
        console.log(subscriptionList);
        // ローカルストレージに代入
        chrome.storage.local.set({
          subscriptionList: subscriptionList
        }, () => {
          console.log("save is success!!");
        });
        // ページ遷移
        location.reload();
      });
    }
  });
});

// 現在開いているページのtitle, url取得
chrome.tabs.query({lastFocusedWindow: true, active: true}, function(tabs) {
  let title = "";
  let url = "";
  tabs.map(function(value) {
    title = value.title;;
    url = value.url;
  });
  document.getElementById("site-name").value = title;
  document.getElementById("site-url").value = url;
});