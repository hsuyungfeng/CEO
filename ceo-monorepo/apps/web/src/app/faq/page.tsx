import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '常見問題 | CEO 團購平台',
  description: 'CEO 團購平台常見問題解答',
};

export default function FAQPage() {
  const faqs = [
    {
      category: '會員註冊與登入',
      questions: [
        {
          q: '如何成為平台會員？',
          a: '請點擊網頁右上角的「註冊」按鈕，填寫您的診所名稱、統一編號、聯絡人等基本資料。提交後需經由我們審核，審核通過後即可開始採購。'
        },
        {
          q: '忘記密碼怎麼辦？',
          a: '請在登入頁面點擊「忘記密碼」，輸入您的註冊信箱，系統將發送重設密碼的連結給您。'
        }
      ]
    },
    {
      category: '關於訂單與採購',
      questions: [
        {
          q: '如何計算階梯價格？',
          a: '平台有部分商品採用「團購階梯價格」模式。當所有買家的總訂購數量達到下一個階梯門檻時，該檔期的所有訂單皆享有更優惠的價格。您可以在商品詳情頁看到目前的集購進度。'
        },
        {
          q: '下單後可以修改或取消訂單嗎？',
          a: '在訂單狀態為「待處理 (PENDING)」時，您可以進入「我的訂單」申請取消。若訂單已進入「確認 (CONFIRMED)」或「出貨中 (SHIPPED)」，則無法直接修改，請聯絡客服協助。'
        }
      ]
    },
    {
      category: '付款與發票',
      questions: [
        {
          q: '提供哪些付款方式？',
          a: '目前支援 B2B 月結帳單、銀行轉帳以及線上刷卡。具體支援的付款方式可能依據您與平台的合約與會員等級而定。'
        },
        {
          q: '會開立統一發票嗎？',
          a: '會的。所有訂單均會開立合法之三聯式電子發票，買方必須在註冊時提供正確的統一編號與公司抬頭。'
        }
      ]
    },
    {
      category: '配送與運費',
      questions: [
        {
          q: '運費如何計算？',
          a: '單筆訂單滿額 (例如 $3,000 元，視目前平台公告而定) 享免運費；未滿免運門檻將酌收基礎物流費。部分大型醫療設備或偏遠地區可能會有額外的運送費用。'
        },
        {
          q: '訂購後多久可以收到商品？',
          a: '現貨商品一般於訂單確認後 2-5 個工作天內出貨。團購性商品則會在「集購檔期結束後」依序安排出貨。'
        }
      ]
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8 text-center">常見問題 (FAQ)</h1>
      
      <div className="space-y-12">
        {faqs.map((group, index) => (
          <div key={index}>
            <h2 className="text-2xl font-semibold mb-6 text-blue-700 border-b pb-2">{group.category}</h2>
            <div className="space-y-6">
              {group.questions.map((faq, qIndex) => (
                <div key={qIndex} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-start">
                    <span className="text-blue-500 font-bold mr-3">Q.</span>
                    {faq.q}
                  </h3>
                  <div className="text-gray-600 flex items-start">
                    <span className="text-green-500 font-bold mr-3">A.</span>
                    <p className="leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-12 text-center bg-gray-50 p-8 rounded-lg">
        <h3 className="text-xl font-medium mb-4">找不到您需要的解答？</h3>
        <p className="text-gray-600 mb-6">歡迎隨時與我們的客服團隊聯繫，我們將盡快為您解答。</p>
        <a 
          href="/contact" 
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
        >
          聯絡我們
        </a>
      </div>
    </div>
  );
}
