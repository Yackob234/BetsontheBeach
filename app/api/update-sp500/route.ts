// app/api/update-sp500/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const BOT_USER_ID = '27872316-99c8-4ff2-b718-56dc23870ada'
const SPY_JUNE1_CLOSE = 756.48
const BASELINE_BALANCE = 1000

export async function GET() {
  try {
    // Fetch current SPY price
    const res = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SPY&apikey=${process.env.ALPHA_VANTAGE_KEY}`
    )
    const data = await res.json()
    const currentPrice = parseFloat(data['Global Quote']['05. price'])

    if (!currentPrice) {
      return NextResponse.json({ error: 'Failed to fetch SPY price' }, { status: 500 })
    }
    console.log(`Current SPY price: ${currentPrice}`)

    // Calculate new balance
    const multiplier = currentPrice / SPY_JUNE1_CLOSE
    const newBalance = BASELINE_BALANCE * multiplier

    console.log(`New balance: ${newBalance}`)

    // Update bot wallet
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase
      .from('wallet')
      .update({ balance: newBalance })
      .eq('user_id', BOT_USER_ID)

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      currentPrice, 
      multiplier, 
      newBalance 
    })

  } catch (err) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}