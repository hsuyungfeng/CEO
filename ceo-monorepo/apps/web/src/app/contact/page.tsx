import { Metadata } from 'next';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: '聯絡我們 | CEO 團購平台',
  description: '如果您有任何問題或建議，請隨時與我們聯絡。',
};

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8 text-center">聯絡我們</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-xl font-semibold mb-6">聯絡資訊</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-1">公司名稱</h3>
              <p className="text-gray-600">一企實業有限公司</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-1">聯絡電話</h3>
              <p className="text-gray-600">(02) 1234-5678</p>
              <p className="text-sm text-gray-500 mt-1">營業時間：週一至週五 09:00 - 18:00</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-1">傳真號碼</h3>
              <p className="text-gray-600">(02) 1234-5679</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-1">公司地址</h3>
              <p className="text-gray-600">台北市中山區南京東路一段123號</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-1">電子郵件</h3>
              <p className="text-gray-600">service@ceo-platform.com</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-6">線上留言</h2>
          
          <form className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">姓名 / 聯絡人</label>
              <input 
                type="text" 
                id="name" 
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                placeholder="請輸入您的姓名"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">電子郵件</label>
              <input 
                type="email" 
                id="email" 
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                placeholder="請輸入您的 Email"
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">聯絡電話</label>
              <input 
                type="tel" 
                id="phone" 
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                placeholder="請輸入您的電話號碼"
              />
            </div>
            
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">主旨</label>
              <select 
                id="subject" 
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">請選擇聯絡主旨</option>
                <option value="product">商品諮詢</option>
                <option value="order">訂單問題</option>
                <option value="return">退換貨申請</option>
                <option value="supplier">供應商合作</option>
                <option value="other">其他問題</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">留言內容</label>
              <textarea 
                id="message" 
                rows={4}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none" 
                placeholder="請詳細描述您的問題或需求"
              ></textarea>
            </div>
            
            <Button type="button" className="w-full">送出留言</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
