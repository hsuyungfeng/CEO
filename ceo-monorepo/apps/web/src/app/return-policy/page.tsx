import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '退換貨政策 | CEO 團購平台',
  description: '了解平台相關退換貨條件與流程。',
};

export default function ReturnPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8 text-center">退換貨政策</h1>
      
      <div className="prose prose-blue max-w-none bg-white p-8 rounded-lg shadow-sm border border-gray-100">
        <p className="text-gray-600 mb-6 font-medium">
          感謝您在 CEO 團購平台進行採購。為了保障買賣雙方的權益，請仔細閱讀以下退換貨政策。
          本平台主要服務 B2B (企業對企業) 客戶，退換貨條款主要針對商品瑕疵與規格不符之情況進行規範。
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">一、 退換貨受理條件</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
          <li><strong>商品瑕疵/破損：</strong>商品送達時已有明顯外觀破損、品質異常或功能無法正常運作。</li>
          <li><strong>規格不符：</strong>收到的商品與您訂購的型號、規格、數量不符。</li>
          <li><strong>申請時效：</strong>請於收到商品後 <strong>七日 (含假日) 內</strong> 提出退換貨申請。逾期因責任歸屬難以釐清，原則上不予受理。</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-4">二、 不予退換貨之情況</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
          <li><strong>無故退貨：</strong>B2B 交易不適用消費者保護法之七天猶豫期 (鑑賞期) 規定，除商品本身瑕疵外，不接受買方單方面無故退貨。</li>
          <li><strong>包裝損毀或人為破壞：</strong>商品外包裝嚴重毀損、封條破壞、缺乏完整性，或因人為使用不當造成的商品損壞。</li>
          <li><strong>個人衛生用品及耗材：</strong>如口罩、手套、無菌包裝耗材等，一經拆封即無法退換。</li>
          <li><strong>特殊訂製/預購商品：</strong>依客戶要求特別訂製或代購之商品，非瑕疵問題不接受退換。</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-4">三、 退換貨申請流程</h2>
        <ol className="list-decimal pl-6 space-y-3 text-gray-700 mb-6">
          <li>
            <strong>提出申請：</strong>至「我的訂單」中找到該筆訂單，點擊「申請退換貨」，或直接聯繫客服並提供：
            <ul className="list-disc pl-6 mt-2 text-sm text-gray-600">
              <li>訂單編號</li>
              <li>商品名稱與數量</li>
              <li>瑕疵狀況說明</li>
              <li>清晰的瑕疵照片或影片</li>
            </ul>
          </li>
          <li><strong>審核評估：</strong>平台與供應商將於 1-3 個工作天內審核您的申請，並透過 Email 或電話與您聯繫。</li>
          <li><strong>商品退回：</strong>審核通過後，客服將指引您退貨方式 (由平台安排物流收回或請您寄回指定地點)。請確保商品包裝、配件、贈品、發票齊全。</li>
          <li><strong>驗收與退款/換貨：</strong>倉庫收到退貨並驗收無誤後，將為您處理換貨寄出或後續退款/帳款沖銷。</li>
        </ol>

        <h2 className="text-xl font-bold mt-8 mb-4">四、 帳款與退款處理</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
          <li><strong>月結客戶：</strong>退貨金額將優先沖銷折抵次月或當月未結帳款。若無未結帳款，將轉入帳戶餘額。</li>
          <li><strong>線上刷卡/轉帳：</strong>將原路退回至您的信用卡帳戶或指定銀行帳戶。處理時程依各家銀行作業時間為主 (通常為 7-14 個工作天)。</li>
        </ul>

        <div className="mt-10 p-4 bg-gray-50 border-l-4 border-blue-500 rounded text-sm text-gray-600">
          <p>若對本政策有任何疑問，歡迎來電 (02) 1234-5678 或來信至 service@ceo-platform.com 洽詢。</p>
          <p className="mt-2 text-xs text-gray-400">最後更新日期：2026 年 3 月 17 日</p>
        </div>
      </div>
    </div>
  );
}
