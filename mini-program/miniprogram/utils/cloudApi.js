/**
 * 云函数统一调用API
 * 为小程序提供统一的云函数调用接口
 */

// 云环境ID
const CLOUD_ENV = 'test-5g91mw2d82f950f1';

/**
 * 封装云函数调用方法
 * @param {string} name - 云函数名称
 * @param {object} data - 请求参数
 * @returns {Promise} - 返回Promise
 */
function callFunction(name, data = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: res => {
        console.log(`[云函数] [${name}]${data.action ? `-[${data.action}]` : ''} 调用成功:`, res);

        // 统一处理返回结果，确保返回格式一致
        if (res.result && res.result.success !== undefined) {
          // 云函数已经按统一格式返回
          resolve(res.result);
        } else {
          // 为了兼容，如果没有按统一格式，也包装成统一格式
          resolve({
            success: true,
            data: res.result,
            message: '调用成功'
          });
        }
      },
      fail: err => {
        console.error(`[云函数] [${name}] 调用失败:`, err);
        reject({
          success: false,
          errMsg: err.errMsg || '云函数调用失败',
          error: err
        });
      }
    });
  });
}

/**
 * 存储相关API
 */
const storageApi = {
  /**
   * 上传图片到云存储
   * @param {string} filePath - 本地临时文件路径
   * @returns {Promise} - 返回Promise，成功时返回fileID
   */
  uploadImage(filePath) {
    return new Promise((resolve, reject) => {
      // 获取openid
      const openid = wx.getStorageSync('openid') || 'unknown_user';
      const cloudPath = `photos/${openid}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.jpg`;

      wx.cloud.uploadFile({
        cloudPath,
        filePath,
        success: res => {
          console.log('上传成功', res);
          resolve({
            success: true,
            data: {
              fileID: res.fileID
            },
            message: '上传成功'
          });
        },
        fail: err => {
          console.error('上传失败', err);
          reject({
            success: false,
            errMsg: '上传失败: ' + err.errMsg,
            error: err
          });
        }
      });
    });
  },

  /**
   * 通过云函数上传Base64图片
   * @param {string} base64Data - 图片的Base64数据
   * @returns {Promise} - 返回Promise
   */
  uploadBase64Image(base64Data) {
    return callFunction('storage', {
      action: 'uploadImage',
      base64Data
    });
  },

  /**
   * 获取文件临时访问地址
   * @param {string|Array} fileList - 文件ID或文件ID数组
   * @returns {Promise} - 返回Promise
   */
  getTempFileURL(fileList) {
    // 如果参数是字符串，转换为数组
    const files = typeof fileList === 'string' ? [fileList] : fileList;

    return callFunction('storage', {
      action: 'getTempURL',
      fileList: files
    });
  },

  /**
   * 删除文件
   * @param {string|Array} fileList - 文件ID或文件ID数组
   * @returns {Promise} - 返回Promise
   */
  deleteFile(fileList) {
    // 如果参数是字符串，转换为数组
    const files = typeof fileList === 'string' ? [fileList] : fileList;

    return callFunction('storage', {
      action: 'deleteFile',
      fileList: files
    });
  },

  /**
   * 处理图片（裁剪、调整大小等）
   * @param {string} fileID - 文件ID
   * @param {object} operations - 操作参数
   * @returns {Promise} - 返回Promise
   */
  processImage(fileID, operations) {
    return callFunction('storage', {
      action: 'processImage',
      fileID,
      operations
    });
  }
};

/**
 * 用户认证相关API
 */
const userApi = {
  /**
   * 登录并获取用户信息
   * @param {object} userInfo - 用户信息对象
   * @returns {Promise} - 返回Promise
   */
  login(userInfo = {}) {
    return callFunction('login', { userInfo });
  }
};

/**
 * 支付和订单相关API
 */
const paymentApi = {
  /**
   * 创建付费订单
   * @param {object} orderData - 订单数据
   * @param {object} userInfo - 用户信息
   * @returns {Promise} - 返回Promise
   */
  createOrder(orderData, userInfo = {}) {
    return callFunction('payment', {
      action: 'createOrder',
      orderData,
      userInfo
    });
  },

  /**
   * 获取支付参数
   * @param {string} id - 订单ID
   * @returns {Promise} - 返回Promise
   */
  getPayParams(id) {
    return callFunction('payment', {
      action: 'getPayParams',
      id
    });
  },

  /**
   * 查询订单信息
   * @param {string} id - 订单ID
   * @returns {Promise} - 返回Promise
   */
  queryOrder(id) {
    return callFunction('payment', {
      action: 'queryOrder',
      id
    });
  },

  /**
   * 获取用户订单列表
   * @param {string} status - 订单状态
   * @param {number} limit - 限制数量
   * @param {number} skip - 跳过数量
   * @returns {Promise} - 返回Promise
   */
  getOrderList(status = '', limit = 10, skip = 0) {
    return callFunction('payment', {
      action: 'getOrderList',
      status,
      limit,
      skip
    });
  },

  /**
   * 标记订单为已完成
   * @param {string} orderId - 订单ID
   * @returns {Promise} - 返回Promise
   */
  completeOrder(id) {
    return callFunction('payment', {
      action: 'completeOrder',
      id
    });
  },

  /**
   * 查询订单支付状态
   * @param {string} orderId - 订单ID
   * @returns {Promise} - 返回Promise
   */
  queryOrderStatus(id) {
    return callFunction('payment', {
      action: 'queryOrderStatus',
      id
    });
  },

  /**
   * 图片分割人物
   * @param {*} tempUrl 
   * @returns 
   */
  processPortrait(tempUrl) {
    return callFunction('payment', {
      action: 'processPortrait',
      imageUrl: tempUrl
    });
  }
};

// 导出API模块
module.exports = {
  storageApi,
  userApi,
  paymentApi,
  callFunction
}; 