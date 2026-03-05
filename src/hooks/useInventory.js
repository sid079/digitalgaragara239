/*
 * RLS POLICY — Run in Supabase SQL Editor if UPDATE is blocked:
 *
 * DROP POLICY IF EXISTS "allow_update" ON lottery_settings;
 * CREATE POLICY "allow_update" ON lottery_settings
 *   FOR UPDATE USING (true) WITH CHECK (true);
 */

import { supabase } from '../supabaseClient'

export function useInventory() {

  async function decrementStock(productId) {
    const { data: current, error: fetchError } = await supabase
      .from('lottery_settings')
      .select('stock_quantity, version')
      .eq('product_id', productId)
      .single()

    if (fetchError || !current) {
      console.error('Could not fetch current stock:', fetchError)
      return { success: false, error: fetchError }
    }

    if (current.stock_quantity <= 0) {
      console.warn('Stock already 0 — skipping decrement')
      return { success: false, outOfStock: true }
    }

    const { data, error } = await supabase
      .from('lottery_settings')
      .update({
        stock_quantity: current.stock_quantity - 1,
        version: current.version + 1
      })
      .eq('product_id', productId)
      .eq('version', current.version)
      .select()
      .single()

    if (error) {
      console.error('DECREMENT FAILED:', error.code, error.message)
      return { success: false, error }
    }

    if (!data) {
      console.warn('DECREMENT: version conflict')
      return { success: false, conflict: true }
    }

    console.log('DECREMENT SUCCESS: new stock =', data.stock_quantity)
    return { success: true, data }
  }

  async function logSpin(machineId, productId, productName, grade) {
    const { error } = await supabase
      .from('lottery_log')
      .insert({
        machine_id: machineId,
        product_id: productId,
        product_name: productName,
        grade: grade
      })

    if (error) {
      console.error('Error logging spin:', error)
    }
  }

  return { decrementStock, logSpin }
}
