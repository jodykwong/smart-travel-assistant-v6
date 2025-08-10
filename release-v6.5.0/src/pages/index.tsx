/**
 * 智游助手v5.0 - 主页
 * Pages Router 兼容版本
 */

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function HomePage() {
  return (
    <>
      <Head>
        <title>智游助手v5.0 - AI旅行规划专家</title>
        <meta name="description" content="基于AI的智能旅行规划系统，为您定制完美的旅行体验" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-white">
        {/* 导航栏 */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <h1 className="text-2xl font-bold text-pink-600">
                    <i className="fas fa-compass mr-2"></i>智游助手
                  </h1>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <a href="#features" className="text-gray-600 hover:text-pink-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">功能特色</a>
                  <a href="#how-it-works" className="text-gray-600 hover:text-pink-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">使用方法</a>
                  <a href="#pricing" className="text-gray-600 hover:text-pink-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">价格方案</a>
                  <button className="text-gray-600 hover:text-pink-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">登录</button>
                  <Link
                    href="/planning"
                    className="bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-pink-700 transition-colors"
                  >
                    免费注册
                  </Link>
                </div>
              </div>
              <div className="md:hidden">
                <button className="text-gray-600 hover:text-pink-600">
                  <i className="fas fa-bars text-xl"></i>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative bg-white overflow-hidden">
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="text-center lg:text-left">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
                    AI驱动的
                    <span className="text-pink-600"> 智能旅行规划</span>
                  </h1>
                  <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                    告别繁琐的旅行规划，让AI为您量身定制完美的旅行体验。从目的地推荐到详细行程，一站式解决您的所有旅行需求。
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
                >
                  <Link
                    href="/planning"
                    className="bg-pink-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-pink-700 transition-all transform hover:scale-105 shadow-lg"
                  >
                    <i className="fas fa-magic mr-2"></i>开始规划旅行
                  </Link>
                  <button className="border-2 border-pink-600 text-pink-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-pink-600 hover:text-white transition-all">
                    <i className="fas fa-play mr-2"></i>观看演示
                  </button>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="mt-8 flex items-center justify-center lg:justify-start space-x-6 text-sm text-gray-500"
                >
                  <div className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-2"></i>
                    <span>免费使用</span>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-2"></i>
                    <span>30秒生成</span>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-2"></i>
                    <span>个性化定制</span>
                  </div>
                </motion.div>
              </div>

              {/* 右侧装饰卡片 */}
              <div className="relative">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, rotate: 3 }}
                  animate={{ opacity: 1, scale: 1, rotate: 3 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  whileHover={{ rotate: 0 }}
                  className="relative z-10 bg-white rounded-2xl shadow-2xl p-8 transform transition-transform duration-500"
                >
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-pink-600 rounded-full flex items-center justify-center">
                        <i className="fas fa-map-marked-alt text-white"></i>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">智能目的地推荐</h3>
                        <p className="text-gray-600 text-sm">基于您的偏好和预算</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                        <i className="fas fa-route text-white"></i>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">详细行程规划</h3>
                        <p className="text-gray-600 text-sm">每日安排精确到小时</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                        <i className="fas fa-calculator text-white"></i>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">预算智能分配</h3>
                        <p className="text-gray-600 text-sm">智能分配旅行预算</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-pink-600/10 rounded-full"></div>
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-green-500/10 rounded-full"></div>
              </div>
            </div>
          </div>
        </section>

        {/* 功能特色区块 */}
        <section id="features" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">为什么选择智游助手？</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">我们的AI技术结合丰富的旅行数据，为您提供前所未有的旅行规划体验</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center p-8 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all"
              >
                <div className="w-16 h-16 bg-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-brain text-white text-2xl"></i>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">AI智能规划</h3>
                <p className="text-gray-600">先进的人工智能算法，根据您的偏好、预算和时间，生成最优的旅行方案</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-center p-8 rounded-xl bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all"
              >
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-clock text-white text-2xl"></i>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">秒速生成</h3>
                <p className="text-gray-600">告别数小时的规划时间，30秒内获得完整的旅行计划，包含详细的每日安排</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-center p-8 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all"
              >
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-users text-white text-2xl"></i>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">个性化定制</h3>
                <p className="text-gray-600">考虑您的兴趣爱好、旅行风格和特殊需求，每个计划都是独一无二的</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-center p-8 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-lg transition-all"
              >
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-map text-white text-2xl"></i>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">实时优化</h3>
                <p className="text-gray-600">根据实时信息调整行程，包括天气、交通、景点开放时间等因素</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-center p-8 rounded-xl bg-gradient-to-br from-red-50 to-red-100 hover:shadow-lg transition-all"
              >
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-heart text-white text-2xl"></i>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">本地体验</h3>
                <p className="text-gray-600">发现隐藏的宝藏景点和当地特色，获得真正的本地化旅行体验</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="text-center p-8 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 hover:shadow-lg transition-all"
              >
                <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-mobile-alt text-white text-2xl"></i>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">随时随地</h3>
                <p className="text-gray-600">完美的移动端体验，旅行中随时查看和调整您的行程安排</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 使用方法区块 */}
        <section id="how-it-works" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">如何使用智游助手？</h2>
              <p className="text-xl text-gray-600">简单几步，即可获得专业级的旅行规划</p>
            </div>
            <div className="grid lg:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center"
              >
                <div className="relative mb-8">
                  <div className="w-20 h-20 bg-pink-600 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-2xl font-bold text-white">1</span>
                  </div>
                  <div className="hidden lg:block absolute top-10 left-full w-full h-0.5 bg-gray-300"></div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">告诉我们您的需求</h3>
                <p className="text-gray-600">输入目的地、出行时间、预算和偏好，让AI了解您的旅行需求</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-center"
              >
                <div className="relative mb-8">
                  <div className="w-20 h-20 bg-pink-600 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-2xl font-bold text-white">2</span>
                  </div>
                  <div className="hidden lg:block absolute top-10 left-full w-full h-0.5 bg-gray-300"></div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">AI智能分析</h3>
                <p className="text-gray-600">我们的AI会分析您的需求，结合实时数据生成最优的旅行方案</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-center"
              >
                <div className="relative mb-8">
                  <div className="w-20 h-20 bg-pink-600 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-2xl font-bold text-white">3</span>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">获得完美计划</h3>
                <p className="text-gray-600">30秒内获得详细的旅行计划，包含景点、餐厅、住宿和交通安排</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20" style={{background: 'linear-gradient(to right top, #d42cb8, #986fed, #3a95ff, #00aff8, #00c1e1, #00cad4, #00d0bb, #00d499, #00d684, #00d76a, #04d74a, #31d714)'}}>
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">准备开始您的智能旅行规划了吗？</h2>
              <p className="text-xl text-white/80 mb-8">加入数万名用户，体验AI驱动的旅行规划革命</p>
              <Link
                href="/planning"
                className="inline-block bg-white text-pink-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
              >
                <i className="fas fa-rocket mr-2"></i>立即开始免费规划
              </Link>
            </motion.div>
          </div>
        </section>

        {/* 页脚 */}
        <footer className="bg-white border-t border-gray-200 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center text-gray-600">
              <p>&copy; 2024 智游助手v5.0. 基于AI的智能旅行规划系统.</p>
              <p className="mt-2 text-sm">
                技术栈: Next.js 15 + React 18 + TypeScript + LangGraph + 高德MCP + DeepSeek
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
