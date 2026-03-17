import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '隱私權政策 | CEO 團購平台',
  description: 'CEO 團購平台隱私權政策與個人資料保護聲明。',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8 text-center">隱私權保護政策</h1>
      
      <div className="prose prose-blue max-w-none bg-white p-8 rounded-lg shadow-sm border border-gray-100">
        <p className="text-gray-600 mb-6 font-medium text-sm">
          最後更新日期：2026 年 3 月 17 日
        </p>

        <p className="text-gray-700 mb-6">
          一企實業有限公司（以下簡稱「本公司」或「我們」）非常重視您的隱私權。
          為了讓您安心使用 CEO 團購平台（以下簡稱「本平台」）的各項服務與資訊，
          特此說明本平台的隱私權保護政策（以下簡稱「本政策」），以保障您的權益。
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">一、 隱私權保護政策的適用範圍</h2>
        <p className="text-gray-700 mb-6">
          隱私權保護政策內容，包括本平台如何處理在您使用網站服務時收集到的個人或企業識別資料。
          本政策不適用於本平台以外的相關連結網站，也不適用於非本平台所委託或參與管理的人員。
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">二、 個人及企業資料的蒐集、處理及利用方式</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
          <li><strong>註冊與帳號：</strong>當您註冊成為平台會員時，我們需要您提供真實的公司名稱、統一編號、聯絡人姓名、聯絡電話、電子信箱等資訊，以便驗證 B2B 交易資格。</li>
          <li><strong>交易與結帳：</strong>為完成訂購結帳、物流配送及發票開立等必要流程，我們會蒐集送貨地址、收件人及付款相關資訊。</li>
          <li><strong>系統與日誌：</strong>為改善服務品質，本系統會自動記錄您的 IP 位址、使用時間、使用的瀏覽器及點選資料記錄等軌跡。</li>
          <li><strong>資料利用範圍：</strong>我們蒐集的資料僅供本平台於其內部、依照蒐集之目的進行處理和利用，除非事先取得您的同意、或者依照相關法律規定，本平台絕不會將您的個人及企業資料提供給第三人或移作其他目的使用。</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-4">三、 資料之保護與安全防護</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
          <li>本平台伺服器配有防火牆、防毒系統等各項資訊安全設備及必要的安全防護措施。</li>
          <li>我們使用傳輸層安全性協定 (TLS/SSL) 加密技術來保護您的交易與敏感資料。</li>
          <li>任何處理資料之從業人員均簽署保密協定，如有違反保密義務，將受相關法律處分。</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-4">四、 第三方服務與資料分享</h2>
        <p className="text-gray-700 mb-6">
          為提供更完善的服務，本平台可能會與第三方服務提供商（例如：金流處理機構、物流公司、簡訊發送商或資料分析工具）分享必要的資料。
          我們承諾僅提供該項服務所必須的最少資訊量，並且嚴格要求合作夥伴遵守個人資料保護法規。
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">五、 Cookie 及網頁技術之使用</h2>
        <p className="text-gray-700 mb-6">
          為了提供您最佳的服務及個人化體驗，本平台會在您的電腦中放置並取用我們的 Cookie。
          您可透過瀏覽器的設定來決定是否接受 Cookie。若您選擇拒絕所有的 Cookie，可能導致本平台部分功能或服務無法正常執行（例如：保持登入狀態或購物車功能）。
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">六、 您的隱私權利</h2>
        <p className="text-gray-700 mb-6">
          依據個人資料保護法，您可以行使以下權利：
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
          <li>查詢或請求閱覽您的資料。</li>
          <li>請求製給複製本。</li>
          <li>請求補充或更正。</li>
          <li>請求停止蒐集、處理或利用。</li>
          <li>請求刪除您的帳號或資料（可能影響您繼續使用本平台的權利）。</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-4">七、 隱私權保護政策之修正</h2>
        <p className="text-gray-700 mb-6">
          本隱私權保護政策將因應需求隨時進行修正，修正後的條款將刊登於網站上。
          若您對本隱私權政策有任何建議或疑問，請透過客服信箱 (service@ceo-platform.com) 與我們聯繫。
        </p>

      </div>
    </div>
  );
}
