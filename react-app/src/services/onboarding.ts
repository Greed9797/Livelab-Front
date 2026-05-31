import axios from 'axios'
import { apiPost } from './api'

export type LiveExperience = 'none' | 'low' | 'moderate' | 'advanced'

export interface OnboardingPayload {
  company_name: string
  responsible_name: string
  main_products: string
  sales_history: string
  focus_products: string
  current_stock: string
  product_margin: string
  gmv_expectation: string
  traffic_budget: string
  website_url?: string | null
  instagram_url?: string | null
  tiktok_url?: string | null
  tiktok_shop_url?: string | null
  available_offers?: string | null
  live_experience: LiveExperience
}

export interface OnboardingResult {
  ok: boolean
  alreadyCompleted?: boolean
}

export async function submitOnboarding(payload: OnboardingPayload): Promise<OnboardingResult> {
  try {
    return await apiPost<OnboardingResult>('/onboarding', payload)
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      return { ok: true, alreadyCompleted: true }
    }
    throw error
  }
}
