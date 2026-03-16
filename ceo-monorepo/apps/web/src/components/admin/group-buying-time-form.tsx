'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Clock } from 'lucide-react';

interface GroupBuyingTimeFormProps {
  onStartDateChange: (date: string, time: string) => void;
  onEndDateChange: (date: string, time: string) => void;
  initialStartDate?: string;
  initialEndDate?: string;
}

export default function GroupBuyingTimeForm({
  onStartDateChange,
  onEndDateChange,
  initialStartDate,
  initialEndDate,
}: GroupBuyingTimeFormProps) {
  // 初始化日期時間
  const initializeDateTime = (isoString?: string) => {
    if (!isoString) {
      return { date: '', time: '' };
    }
    const date = new Date(isoString);
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toISOString().split('T')[1]?.slice(0, 5) || '00:00';
    return { date: dateStr, time: timeStr };
  };

  const startInit = initializeDateTime(initialStartDate);
  const endInit = initializeDateTime(initialEndDate);

  const [startDate, setStartDate] = useState(startInit.date);
  const [startTime, setStartTime] = useState(startInit.time);
  const [endDate, setEndDate] = useState(endInit.date);
  const [endTime, setEndTime] = useState(endInit.time);
  const [duration, setDuration] = useState<number | null>(null);

  // 計算持續天數
  useEffect(() => {
    if (startDate && startTime && endDate && endTime) {
      const start = new Date(`${startDate}T${startTime}:00`);
      const end = new Date(`${endDate}T${endTime}:00`);
      const diffMs = end.getTime() - start.getTime();
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      setDuration(days > 0 ? days : null);
    } else {
      setDuration(null);
    }
  }, [startDate, startTime, endDate, endTime]);

  // 當開始時間變更時通知父元件
  useEffect(() => {
    onStartDateChange(startDate, startTime);
  }, [startDate, startTime, onStartDateChange]);

  // 當結束時間變更時通知父元件
  useEffect(() => {
    onEndDateChange(endDate, endTime);
  }, [endDate, endTime, onEndDateChange]);

  // 自動計算：將開始時間設為現在
  const handleAutoCalculate = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toISOString().split('T')[1]?.slice(0, 5) || '00:00';

    setStartDate(dateStr);
    setStartTime(timeStr);

    // 如果結束時間早於開始時間，自動調整為開始時間 + 7 天
    if (endDate && endTime) {
      const end = new Date(`${endDate}T${endTime}:00`);
      if (end <= now) {
        const newEnd = new Date(now);
        newEnd.setDate(newEnd.getDate() + 7);
        const newEndDateStr = newEnd.toISOString().split('T')[0];
        const newEndTimeStr = newEnd.toISOString().split('T')[1]?.slice(0, 5) || '00:00';
        setEndDate(newEndDateStr);
        setEndTime(newEndTimeStr);
      }
    }
  };

  // 快速增加天數
  const handleQuickAdd = (days: number) => {
    // 基於當前時間計算結束時間
    const now = new Date();
    const endDateTime = new Date(now);
    endDateTime.setDate(endDateTime.getDate() + days);

    const newEndDate = endDateTime.toISOString().split('T')[0];
    const newEndTime = now.toISOString().split('T')[1]?.slice(0, 5) || '00:00';

    setEndDate(newEndDate);
    setEndTime(newEndTime);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>團購時間</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 開始時間 */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">開始時間</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-10"
                placeholder="年/月/日"
              />
            </div>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* 結束時間 */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">結束時間</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-10"
                placeholder="年/月/日"
              />
            </div>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* 快速增加按鈕 */}
          <div className="flex gap-2 mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdd(7)}
              className="flex-1"
            >
              增加 7 天
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdd(14)}
              className="flex-1"
            >
              14 天
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdd(28)}
              className="flex-1"
            >
              28 天
            </Button>
          </div>
        </div>

        {/* 自動計算按鈕 */}
        <Button
          type="button"
          variant="secondary"
          onClick={handleAutoCalculate}
          className="w-full"
        >
          自動計算
        </Button>

        {/* 持續時長顯示 */}
        {duration !== null && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">團購期間：</span>{duration} 天
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
