'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface CreateSupplierDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  taxId: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  industry: string;
}

const initialForm: FormData = {
  taxId: '',
  companyName: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  industry: '',
};

export default function CreateSupplierDialog({ isOpen, onClose, onSuccess }: CreateSupplierDialogProps) {
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await response.json();
      if (!response.ok) {
        const msg = json?.error?.message || `新增失敗 (${response.status})`;
        throw new Error(msg);
      }
      setForm(initialForm);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '新增供應商失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm(initialForm);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>新增供應商</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <Field label="統一編號 *" name="taxId" value={form.taxId} onChange={handleChange} placeholder="8位數字" maxLength={8} />
          <Field label="公司名稱 *" name="companyName" value={form.companyName} onChange={handleChange} placeholder="健康醫療器材有限公司" />
          <Field label="聯絡人 *" name="contactPerson" value={form.contactPerson} onChange={handleChange} placeholder="王小明" />
          <Field label="電話 *" name="phone" value={form.phone} onChange={handleChange} placeholder="0912345678" />
          <Field label="電子郵件 *" name="email" type="email" value={form.email} onChange={handleChange} placeholder="contact@supplier.com" />
          <Field label="地址" name="address" value={form.address} onChange={handleChange} placeholder="台北市信義區..." />
          <Field label="產業類別" name="industry" value={form.industry} onChange={handleChange} placeholder="醫療器材" />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>取消</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? '新增中...' : '確認新增'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label, name, value, onChange, placeholder, type = 'text', maxLength,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <Input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        required={label.endsWith('*')}
      />
    </div>
  );
}
