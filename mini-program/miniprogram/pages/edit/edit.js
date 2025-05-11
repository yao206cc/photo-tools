// 引入TDesign Toast
import Toast from 'tdesign-miniprogram/toast/index';
// 引入云API工具
import { storageApi, paymentApi } from '../../utils/cloudApi';

// 尺寸信息常量
const sizeInfo = {
  'size1': {
    name: '1寸照片',
    width: 25,
    height: 35,
    background: 'blue',
    description: '常用于证件、简历',
  },
  'size2': {
    name: '2寸照片',
    width: 35,
    height: 45,
    background: 'blue',
    description: '常用于简历、证件、档案资料',
  },
  'drive': {
    name: '驾照照片',
    width: 22,
    height: 32,
    background: 'blue',
    description: '用于驾照办理',
  },
  'usa': {
    name: '美签照片',
    width: 51,
    height: 51,
    background: 'white',
    description: '用于美国签证',
  },
};

Page({
  data: {
    imagePath: '',
    sizeType: 'size1',
    currentSize: sizeInfo['size1'],
    currentBgIndex: 0, // 默认蓝底
    bgColors: [{
      name: '蓝色',
      value: '#0052d9'
    },
    {
      name: '红色',
      value: '#e34d59'
    },
    {
      name: '白色',
      value: '#ffffff'
    },
    {
      name: '灰色',
      value: '#f5f5f5'
    },
    ],
    showImageViewer: false, // 控制图片查看器的显示
    imageWidth: 366, // 固定宽度
    imageHeight: 500
  },

  onLoad(options) {
    // 获取传递的参数
    const {
      size
    } = options;
    const app = getApp();

    // 获取全局存储的图片路径
    if (app.globalData && app.globalData.tempImagePath) {
      this.setData({
        imagePath: app.globalData.tempImagePath
      }, () => {
        // 加载图片后计算高度
        this.calculateImageHeight();
      });
    } else {
      Toast({
        context: this,
        selector: '#t-toast',
        message: '未找到照片，请返回重试',
        theme: 'error',
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    // 设置当前尺寸
    if (size && sizeInfo[size]) {
      this.setData({
        sizeType: size,
        currentSize: sizeInfo[size]
      }, () => {
        // 尺寸更新后计算高度
        this.calculateImageHeight();
      });
    }
  },

  // 计算图片显示高度
  calculateImageHeight() {
    const {
      imagePath,
      currentSize,
      imageWidth
    } = this.data;

    if (!imagePath) return;

    // 获取图片信息
    wx.getImageInfo({
      src: imagePath,
      success: (res) => {
        // 原始图片宽高
        const {
          width: originalWidth,
          height: originalHeight
        } = res;

        // 计算比例
        const aspectRatio = originalHeight / originalWidth;

        // 证件照的宽高比
        const targetRatio = currentSize.height / currentSize.width;

        // 根据宽高比计算应该显示的高度
        let displayHeight;

        if (aspectRatio > targetRatio) {
          // 如果原图更"高瘦"，那么以宽度为基准
          displayHeight = imageWidth * targetRatio;
        } else {
          // 如果原图更"矮胖"，以高度为基准，保持原图比例
          displayHeight = imageWidth * aspectRatio;
        }

        // 更新高度
        this.setData({
          imageHeight: Math.round(displayHeight)
        });
      },
      fail: (err) => {
        console.error('获取图片信息失败', err);
        // 使用默认高度
        const defaultHeight = imageWidth * (currentSize.height / currentSize.width);
        this.setData({
          height: Math.round(defaultHeight)
        });
      }
    });
  },

  // 更换背景颜色
  changeBgColor(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      currentBgIndex: index
    });

    Toast({
      context: this,
      selector: '#t-toast',
      message: `背景已更改为${this.data.bgColors[index].name}`,
      theme: 'success',
      duration: 1000,
    });
  },

  // 预览图片
  previewImage() {
    this.setData({
      showImageViewer: true
    });
  },

  // 关闭图片预览
  closeImageViewer() {
    this.setData({
      showImageViewer: false
    });
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 上传图片到云存储
  uploadImageToCloud(filePath) {
    return new Promise((resolve, reject) => {
      // 先上传原图
      storageApi.uploadImage(filePath)
        .then(result => {
          if (!result.success) {
            throw new Error(result.errMsg || '解析图片失败');
          }

          const originalFileID = result.data.fileID;

          // 获取图片临时URL
          return storageApi.getTempFileURL(originalFileID)
            .then(urlResult => {
              if (!urlResult.success || !urlResult.data || !urlResult.data.length) {
                throw new Error('获取图片URL失败');
              }
              return {
                fileID: originalFileID,
                tempUrl: urlResult.data[0].tempFileURL
              };
            });
        })
        .then(({ fileID, tempUrl }) => {
          // 调用人像分割API
          return paymentApi.processPortrait(tempUrl)
            .then(processResult => {
              if (!processResult.success) {
                throw new Error('解析图片失败: ' + processResult.error);
              }

              // 直接返回处理后的图片URL
              resolve({
                success: true,
                data: {
                  originalFileID: fileID,
                  processedImageUrl: processResult.resultImageUrl
                }
              });
            });
        })
        .catch(error => {
          console.error('图片处理失败:', error);
          reject(error);
        });
    });
  },

  // 前往结果页
  goToResult() {
    // 显示加载提示
    wx.showLoading({
      title: '处理中...',
    });

    // 上传并处理图片
    this.uploadImageToCloud(this.data.imagePath)
      .then(result => {
        // 隐藏加载提示
        wx.hideLoading();

        if (result.success) {
          const { originalFileID, processedImageUrl } = result.data;

          // 保存当前编辑状态到全局数据
          const app = getApp();
          app.globalData = app.globalData || {};
          app.globalData.editedPhoto = {
            originalFileID: originalFileID,
            processedImageUrl: processedImageUrl,
            sizeType: this.data.sizeType,
            bgColor: this.data.bgColors[this.data.currentBgIndex].value
          };
          // 跳转到结果页，传递处理后的图片URL
          wx.navigateTo({
            url: `/pages/result/result?photoUrl=${encodeURIComponent(processedImageUrl)}&originalFileID=${encodeURIComponent(originalFileID)}&backgroundColor=${this.data.bgColors[this.data.currentBgIndex].value}&width=${this.data.currentSize.width}&height=${this.data.currentSize.height}&sizeName=${this.data.currentSize.name}&compliancePassed=true&warnings=0&physical=${this.data.currentSize.width}mm×${this.data.currentSize.height}mm`
          });
        } else {
          throw new Error(result.errMsg || '处理图片失败');
        }
      })
      .catch(error => {
        wx.hideLoading();
        console.error('处理图片失败', error);
        Toast({
          context: this,
          selector: '#t-toast',
          message: error.message || '处理图片失败，请重试',
          theme: 'error',
        });
      });
  }
})