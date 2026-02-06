"use client";

import React from "react";
import {
  useSubscriptionStatus,
  getStatusMessage,
  getExpirationText,
  getStatusBadgeClass
} from "@/lib/hooks/useSubscriptionStatus";
import { formatDate } from "@/lib/formatters";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Zap
} from "lucide-react";

interface SubscriptionStatusCardProps {
  className?: string;
  showDetails?: boolean;
  onManageClick?: () => void;
}

/**
 * Comprehensive subscription status component showing all subscription states:
 * - Active (with renewal date)
 * - Trial (with days remaining)
 * - Canceled
 * - Payment Failed (with grace period info)
 * - Expires Soon (cancel_at_period_end)
 *
 * Handles all standard SaaS subscription scenarios for production apps
 */
export function SubscriptionStatusCard({
  className = "",
  showDetails = true,
  onManageClick
}: SubscriptionStatusCardProps) {
  const status = useSubscriptionStatus();

  if (status.isLoading) {
    return (
      <div
        className={`rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Loading subscription status...
          </span>
        </div>
      </div>
    );
  }

  // ✅ ACTIVE SUBSCRIPTION
  if (status.status === "active") {
    return (
      <div
        className={`rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950 ${className}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600 dark:text-green-400" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 dark:text-green-200">
                Subscription Active
              </h3>
              <p className="mt-1 text-sm text-green-800 dark:text-green-300">
                {status.plan && `${status.plan} plan • `}
                {status.currentPeriodEnd && (
                  <>Renews on {formatDate(status.currentPeriodEnd)}</>
                )}
              </p>
              {showDetails && status.daysUntilExpiration !== null && (
                <p className="mt-1 text-xs text-green-700 dark:text-green-400">
                  {status.daysUntilExpiration} days until next renewal
                </p>
              )}
            </div>
          </div>
          {onManageClick && (
            <button
              onClick={onManageClick}
              className="rounded-md bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
            >
              Manage
            </button>
          )}
        </div>
      </div>
    );
  }

  // ✅ TRIAL SUBSCRIPTION
  if (status.isTrialing) {
    return (
      <div
        className={`rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950 ${className}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Zap className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200">
                Free Trial Active
              </h3>
              <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
                {status.plan && `${status.plan} plan • `}
                {status.trialEndDate && (
                  <>Trial ends on {formatDate(status.trialEndDate)}</>
                )}
              </p>
              {showDetails && status.daysUntilExpiration !== null && (
                <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                  {status.daysUntilExpiration === 1
                    ? "1 day remaining"
                    : `${status.daysUntilExpiration} days remaining`}
                </p>
              )}
            </div>
          </div>
          {onManageClick && (
            <button
              onClick={onManageClick}
              className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              Manage
            </button>
          )}
        </div>
      </div>
    );
  }

  // ✅ GRACE PERIOD (Payment Failed)
  if (status.isInGracePeriod) {
    return (
      <div
        className={`rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950 ${className}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-200">
                Payment Failed - Grace Period Active
              </h3>
              <p className="mt-1 text-sm text-yellow-800 dark:text-yellow-300">
                Your payment couldn't be processed. Update your payment method
                to restore full access.
              </p>
              {showDetails && status.gracePeriodEndDate && (
                <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-400">
                  Grace period expires: {formatDate(status.gracePeriodEndDate)}
                </p>
              )}
              {showDetails && status.daysUntilExpiration !== null && (
                <p className="mt-1 text-xs font-medium text-yellow-700 dark:text-yellow-400">
                  {status.daysUntilExpiration === 1
                    ? "⚠️ 1 day left to update payment"
                    : `⚠️ ${status.daysUntilExpiration} days left to update payment`}
                </p>
              )}
            </div>
          </div>
          {onManageClick && (
            <button
              onClick={onManageClick}
              className="whitespace-nowrap rounded-md bg-yellow-600 px-3 py-1 text-sm font-medium text-white hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-600"
            >
              Update Payment
            </button>
          )}
        </div>
      </div>
    );
  }

  // ✅ EXPIRES SOON (cancelAtPeriodEnd)
  if (status.status === "expires_soon") {
    return (
      <div
        className={`rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950 ${className}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 text-orange-600 dark:text-orange-400" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 dark:text-orange-200">
                Subscription Expires Soon
              </h3>
              <p className="mt-1 text-sm text-orange-800 dark:text-orange-300">
                You've scheduled cancellation. Your {status.plan} plan will end
                on{" "}
                {status.currentPeriodEnd && formatDate(status.currentPeriodEnd)}
                .
              </p>
              {showDetails && status.daysUntilExpiration !== null && (
                <p className="mt-1 text-xs text-orange-700 dark:text-orange-400">
                  You'll lose access in{" "}
                  {status.daysUntilExpiration === 1
                    ? "1 day"
                    : `${status.daysUntilExpiration} days`}
                </p>
              )}
            </div>
          </div>
          {onManageClick && (
            <button
              onClick={onManageClick}
              className="whitespace-nowrap rounded-md bg-orange-600 px-3 py-1 text-sm font-medium text-white hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600"
            >
              Reactivate
            </button>
          )}
        </div>
      </div>
    );
  }

  // ✅ CANCELED SUBSCRIPTION
  if (status.status === "canceled") {
    return (
      <div
        className={`rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900 ${className}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-gray-600 dark:text-gray-400" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-200">
                Subscription Canceled
              </h3>
              <p className="mt-1 text-sm text-gray-800 dark:text-gray-300">
                Your subscription has been canceled. You now have access to the
                free sandbox plan only.
              </p>
            </div>
          </div>
          {onManageClick && (
            <button
              onClick={onManageClick}
              className="whitespace-nowrap rounded-md bg-gray-600 px-3 py-1 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              Upgrade
            </button>
          )}
        </div>
      </div>
    );
  }

  // ✅ PAST DUE (without grace period)
  if (status.status === "past_due") {
    return (
      <div
        className={`rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950 ${className}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-200">
                Payment Past Due
              </h3>
              <p className="mt-1 text-sm text-red-800 dark:text-red-300">
                Your account has an outstanding payment. Please update your
                payment method immediately to avoid service suspension.
              </p>
            </div>
          </div>
          {onManageClick && (
            <button
              onClick={onManageClick}
              className="whitespace-nowrap rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
            >
              Settle Now
            </button>
          )}
        </div>
      </div>
    );
  }

  // ✅ NO SUBSCRIPTION
  if (status.status === "no-subscription") {
    return (
      <div
        className={`rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900 ${className}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Calendar className="mt-0.5 h-5 w-5 text-gray-600 dark:text-gray-400" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-200">
                No Active Subscription
              </h3>
              <p className="mt-1 text-sm text-gray-800 dark:text-gray-300">
                You're currently on the free sandbox plan. Upgrade to unlock
                more features and GPTs.
              </p>
            </div>
          </div>
          {onManageClick && (
            <button
              onClick={onManageClick}
              className="whitespace-nowrap rounded-md bg-gray-600 px-3 py-1 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              View Plans
            </button>
          )}
        </div>
      </div>
    );
  }

  // ✅ DEFAULT/UNKNOWN STATE
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 text-gray-600 dark:text-gray-400" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-200">
            Unknown Subscription Status
          </h3>
          <p className="mt-1 text-sm text-gray-800 dark:text-gray-300">
            Unable to determine your subscription status. Please contact support
            if this persists.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionStatusCard;
