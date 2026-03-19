'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface CreateMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const initialForm = {
  taxId: '',
  name: '',
  email: '',
  password: '',
  phone: '',
  address: '',
  contactPerson: '',
};

export default function CreateMemberDialog({ isOpen, onClose, onSuccess }: CreateMemberDialogProps) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: keyof typeof initialForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '新增失敗');
        return;
      }
      setForm(initialForm);
      onSuccess();
      onClose();
    } catch {
      setError('網路錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm(initialForm);
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>新增企業會員</DialogTitle>
          <DialogDescription>填寫企業基本資料，系統將建立會員帳號。</DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="taxId">統一編號 *</Label>
              <Input
                id="taxId"
                placeholder="8位數字"
                maxLength={8}
                value={form.taxId}
                onChange={handleChange('taxId')}
              />
            </div>
            <div>
              <Label htmlFor="name">公司名稱 *</Label>
              <Input
                id="name"
                placeholder="公司全名"
                value={form.name}
                onChange={handleChange('name')}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="company@example.com"
              value={form.email}
              onChange={handleChange('email')}
            />
          </div>

          <div>
            <Label htmlFor="password">初始密碼 *</Label>
            <Input
              id="password"
              type="password"
              placeholder="至少6位"
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange('password')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactPerson">聯絡人</Label>
              <Input
                id="contactPerson"
                placeholder="聯絡人姓名"
                value={form.contactPerson}
                onChange={handleChange('contactPerson')}
              />
            </div>
            <div>
              <Label htmlFor="phone">電話</Label>
              <Input
                id="phone"
                placeholder="02-12345678"
                value={form.phone}
                onChange={handleChange('phone')}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">地址</Label>
            <Input
              id="address"
              placeholder="公司地址"
              value={form.address}
              onChange={handleChange('address')}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '新增中...' : '新增會員'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
