/*
  Ensure Realtime is enabled on both tables — run in Supabase SQL editor:

  ALTER PUBLICATION supabase_realtime ADD TABLE products;
  ALTER PUBLICATION supabase_realtime ADD TABLE lottery_settings;
*/
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

export function useLotteryPool(grade) {
  const [pool, setPool] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalStock, setTotalStock] = useState(0)

  const fetchPool = useCallback(async () => {
    if (!grade) return

    const { data, error } = await supabase
      .from('lottery_settings')
      .select(`
        *,
        products (*)
      `)
      .eq('products.grade', grade)
      .eq('is_active', true)
      .gt('stock_quantity', 0)

    if (error) {
      console.error('Pool fetch error:', error)
      setLoading(false)
      return
    }

    const validPool = (data || []).filter(s => s.products !== null)

    setPool(validPool)
    setTotalStock(validPool.reduce((sum, item) => sum + item.stock_quantity, 0))
    setLoading(false)
  }, [grade])

  useEffect(() => {
    fetchPool()

    const channel = supabase
      .channel('lottery_settings_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lottery_settings'
      }, () => {
        fetchPool()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchPool])

  return { pool, loading, totalStock, refreshPool: fetchPool }
}
