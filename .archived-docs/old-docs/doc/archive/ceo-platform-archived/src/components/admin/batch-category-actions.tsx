'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, MoreHorizontal, Power, PowerOff, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface BatchCategoryActionsProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onSuccess: () => void;
}

export function BatchCategoryActions({ 
  selectedIds, 
  onSelectionChange,
  onSuccess 
}: BatchCategoryActionsProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingOperation, setPendingOperation] = useState<'activate' | 'deactivate' | 'delete' | null>(null);
  const [loading, setLoading] = useState(false);

  // 選擇/取消選擇所有
  const [selectAll, setSelectAll] = useState(false);

  // 執行批量操作
  const executeBatchOperation = async () => {
    if (!pendingOperation || selectedIds.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: selectedIds,
          operation: pendingOperation,
        }),
      });

      const result = await response.json();

      if (result.success) {
        let message = '';
        switch (pendingOperation) {
          case 'activate':
            message = `已啟用 ${result.data.count} 個分類`;
            break;
          case 'deactivate':
            message = `已停用 ${result.data.count} 個分類`;
            break;
          case 'delete':
            message = `已刪除 ${result.data.count} 個分類`;
            break;
        }
        
        toast.success(message);
        onSuccess();
        onSelectionChange([]); // 清空選擇
        setSelectAll(false);
      } else {
        toast.error(result.error || '操作失敗');
      }
    } catch (error) {
      toast.error('網絡錯誤，請稍後再試');
      console.error('批量操作錯誤:', error);
    } finally {
      setLoading(false);
      setShowConfirmDialog(false);
      setPendingOperation(null);
    }
  };

  // 確認對話框內容
  const getConfirmDialogContent = () => {
    if (!pendingOperation) return null;

    const count = selectedIds.length;
    let title = '';
    let description = '';
    let confirmText = '';

    switch (pendingOperation) {
      case 'activate':
        title = '確認啟用分類';
        description = `確定要啟用選中的 ${count} 個分類嗎？`;
        confirmText = '啟用';
        break;
      case 'deactivate':
        title = '確認停用分類';
        description = `確定要停用選中的 ${count} 個分類嗎？停用的分類將不會在前台顯示。`;
        confirmText = '停用';
        break;
      case 'delete':
        title = '確認刪除分類';
        description = `確定要刪除選中的 ${count} 個分類嗎？此操作無法撤銷，分類下的商品將變為未分類狀態。`;
        confirmText = '刪除';
        break;
    }

    return { title, description, confirmText };
  };

  const dialogContent = getConfirmDialogContent();

  return (
    <>
      <div className="flex items-center gap-2">
        {/* 全選按鈕 */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="select-all"
            checked={selectAll}
            onCheckedChange={(checked) => {
              setSelectAll(!!checked);
              // 這裡需要實際實現全選邏輯
              // onSelectionChange(checked ? allCategoryIds : []);
            }}
          />
          <label
            htmlFor="select-all"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            全選
          </label>
        </div>

        {/* 已選擇數量 */}
        {selectedIds.length > 0 && (
          <span className="text-sm text-gray-600">
            已選擇 {selectedIds.length} 個分類
          </span>
        )}

        {/* 批量操作菜單 */}
        {selectedIds.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="mr-2 h-4 w-4" />
                批量操作
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setPendingOperation('activate');
                  setShowConfirmDialog(true);
                }}
              >
                <Power className="mr-2 h-4 w-4" />
                啟用選中分類
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setPendingOperation('deactivate');
                  setShowConfirmDialog(true);
                }}
              >
                <PowerOff className="mr-2 h-4 w-4" />
                停用選中分類
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setPendingOperation('delete');
                  setShowConfirmDialog(true);
                }}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                刪除選中分類
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* 確認對話框 */}
      {dialogContent && (
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{dialogContent.title}</DialogTitle>
              <DialogDescription>
                {dialogContent.description}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmDialog(false);
                  setPendingOperation(null);
                }}
                disabled={loading}
              >
                取消
              </Button>
              <Button
                variant={pendingOperation === 'delete' ? 'destructive' : 'default'}
                onClick={executeBatchOperation}
                disabled={loading}
              >
                {loading ? '處理中...' : dialogContent.confirmText}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}