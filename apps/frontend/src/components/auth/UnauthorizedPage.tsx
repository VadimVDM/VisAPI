'use client';

import { motion } from 'framer-motion';
import { Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface UnauthorizedPageProps {
  message?: string;
  showBackButton?: boolean;
}

export const UnauthorizedPage = ({
  message = "You don't have permission to access this page.",
  showBackButton = true,
}: UnauthorizedPageProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5, type: 'spring' }}
          className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-8"
        >
          <Shield className="h-12 w-12 text-red-600" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="space-y-4"
        >
          <h1 className="text-4xl font-bold text-gray-900">Access Denied</h1>

          <p className="text-lg text-gray-600 max-w-md mx-auto">{message}</p>

          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact your administrator.
          </p>

          {showBackButton && (
            <div className="pt-6 space-y-3">
              <Link href="/dashboard">
                <Button className="inline-flex items-center">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};
