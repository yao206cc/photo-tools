/**
 * 图片处理工具函数
 */

import { storageApi } from './cloudApi';

/**
 * 获取图片信息（宽、高、路径等）
 * @param {string} src - 图片路径
 * @returns {Promise} - 返回Promise，成功时返回图片信息对象
 */
function getImageInfo(src) {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src,
      success: res => {
        resolve(res);
      },
      fail: err => {
        reject(err);
      }
    });
  });
}

/**
 * 将本地临时文件路径转为base64
 * @param {string} filePath - 本地临时文件路径
 * @returns {Promise} - 返回Promise，成功时返回base64字符串
 */
function filePathToBase64(filePath) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath,
      encoding: 'base64',
      success: res => {
        // 添加base64头部信息
        const base64Data = `data:image/jpeg;base64,${res.data}`;
        resolve(base64Data);
      },
      fail: err => {
        reject(err);
      }
    });
  });
}

/**
 * 使用canvas进行图片裁剪
 * @param {string} src - 图片路径
 * @param {number} x - 裁剪起点x坐标
 * @param {number} y - 裁剪起点y坐标
 * @param {number} width - 裁剪宽度
 * @param {number} height - 裁剪高度
 * @returns {Promise} - 返回Promise，成功时返回裁剪后的临时文件路径
 */
function cropImage(src, x, y, width, height) {
  return new Promise((resolve, reject) => {
    const ctx = wx.createCanvasContext('cropCanvas');
    
    ctx.drawImage(src, x, y, width, height, 0, 0, width, height);
    ctx.draw(false, () => {
      // 将Canvas内容保存为图片
      wx.canvasToTempFilePath({
        canvasId: 'cropCanvas',
        success: res => {
          resolve(res.tempFilePath);
        },
        fail: err => {
          reject(err);
        }
      });
    });
  });
}

/**
 * 保存图片到相册
 * @param {string} filePath - 图片路径
 * @returns {Promise} - 返回Promise
 */
function saveImageToAlbum(filePath) {
  return new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: res => {
        resolve(res);
      },
      fail: err => {
        if (err.errMsg.indexOf('auth deny') >= 0) {
          // 用户拒绝授权，引导用户打开设置页允许授权
          openAuthSetting().then(resolve).catch(reject);
        } else {
          reject(err);
        }
      }
    });
  });
}

/**
 * 打开授权设置页面
 * @returns {Promise} - 返回Promise
 */
function openAuthSetting() {
  return new Promise((resolve, reject) => {
    wx.showModal({
      title: '提示',
      content: '需要您授权保存图片到相册',
      confirmText: '去设置',
      success: res => {
        if (res.confirm) {
          wx.openSetting({
            success: settingRes => {
              if (settingRes.authSetting['scope.writePhotosAlbum']) {
                resolve(settingRes);
              } else {
                reject(new Error('用户拒绝授权'));
              }
            },
            fail: err => {
              reject(err);
            }
          });
        } else {
          reject(new Error('用户取消操作'));
        }
      },
      fail: err => {
        reject(err);
      }
    });
  });
}

/**
 * 使用云存储上传本地临时文件
 * 优先使用本地文件上传，当错误时尝试使用Base64方式上传
 * @param {string} filePath - 本地临时文件路径
 * @returns {Promise} - 返回Promise，成功时返回fileID
 */
async function uploadToCloud(filePath) {
  try {
    // 尝试直接上传本地文件
    const result = await storageApi.uploadImage(filePath);
    if (result.success) {
      return result;
    }
    
    // 如果直接上传失败，尝试转为base64再上传
    console.log('直接上传失败，尝试使用base64方式上传');
    const base64Data = await filePathToBase64(filePath);
    const base64Result = await storageApi.uploadBase64Image(base64Data);
    
    return base64Result;
  } catch (err) {
    console.error('上传到云存储失败', err);
    throw err;
  }
}

/**
 * 获取图片缩略图
 * @param {string} fileID - 文件ID
 * @param {number} width - 缩略图宽度
 * @param {number} height - 缩略图高度
 * @returns {Promise} - 返回Promise，成功时返回缩略图临时访问地址
 */
async function getThumbnail(fileID, width = 200, height = 200) {
  try {
    // 进行图片处理
    const result = await storageApi.processImage(fileID, {
      thumbnail: { width, height }
    });
    
    if (result.success) {
      // 获取处理后的文件临时地址
      const urlResult = await storageApi.getTempFileURL(result.data.processedFileID);
      if (urlResult.success && urlResult.data.length > 0) {
        return {
          success: true,
          data: { tempFileURL: urlResult.data[0].tempFileURL }
        };
      }
    }
    
    // 如果处理失败，尝试直接获取原图的临时地址
    const fallbackResult = await storageApi.getTempFileURL(fileID);
    if (fallbackResult.success && fallbackResult.data.length > 0) {
      return {
        success: true,
        data: { tempFileURL: fallbackResult.data[0].tempFileURL }
      };
    }
    
    return {
      success: false,
      errMsg: '获取缩略图失败'
    };
  } catch (err) {
    console.error('获取缩略图失败', err);
    return {
      success: false,
      errMsg: '获取缩略图失败: ' + err.message
    };
  }
}

// 导出工具函数
module.exports = {
  getImageInfo,
  filePathToBase64,
  cropImage,
  saveImageToAlbum,
  openAuthSetting,
  uploadToCloud,
  getThumbnail
}; 