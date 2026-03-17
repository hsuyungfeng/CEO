import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export async function Footer() {
  let contactInfo = {
    companyName: '一企實業有限公司',
    phone: '(02) 1234-5678',
    fax: '(02) 1234-5679',
    address: '台北市中山區南京東路一段123號'
  };

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'contact_info' }
    });
    if (setting && setting.value) {
      contactInfo = { ...contactInfo, ...JSON.parse(setting.value) };
    }
  } catch (error) {
    console.error('Failed to load contact info in footer:', error);
  }

  return (
    <footer className="bg-gray-800 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4">CEO 團購平台</h3>
            <p className="text-gray-300">
              專為機構打造的專業團購平台，提供優質商品和量大價優的採購體驗。
            </p>
          </div>
          
          <div>
            <h4 className="text-md font-semibold mb-4">會員服務</h4>
            <ul className="space-y-2 text-gray-300">
              <li><Link href="/login" className="hover:text-white">會員登入</Link></li>
              <li><Link href="/register" className="hover:text-white">會員註冊</Link></li>
              <li><Link href="/orders" className="hover:text-white">我的訂單</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-md font-semibold mb-4">客戶服務</h4>
            <ul className="space-y-2 text-gray-300">
              <li><Link href="/contact" className="hover:text-white">聯絡我們</Link></li>
              <li><Link href="/faq" className="hover:text-white">常見問題</Link></li>
              <li><Link href="/return-policy" className="hover:text-white">退換貨政策</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-white">隱私權政策</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-md font-semibold mb-4">聯絡資訊</h4>
            <address className="not-italic text-gray-300">
              <p>{contactInfo.companyName}</p>
              <p className="mt-2">電話: {contactInfo.phone}</p>
              {contactInfo.fax && <p>傳真: {contactInfo.fax}</p>}
              <p className="mt-2">地址: {contactInfo.address}</p>
            </address>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2026 CEO 團購電商平台. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}