// 引入TDesign Toast
import Toast from 'tdesign-miniprogram/toast/index';

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
    sizeType: '',
    currentSize: null,
    actionSheetVisible: false,
    actions: ['选择相册', '拍摄照片']
  },

  onLoad(options) {
    // 获取传递过来的尺寸类型
    const { size } = options;
    
    if (size && sizeInfo[size]) {
      this.setData({
        sizeType: size,
        currentSize: sizeInfo[size]
      });
    } else {
      // 默认使用1寸照片
      this.setData({
        sizeType: 'size1',
        currentSize: sizeInfo['size1']
      });
    }
    
    // 调试信息，检查初始化是否正确
    console.log('页面加载完成，当前尺寸:', this.data.currentSize);
  },
  
  // 显示底部操作表
  showActionSheet() {
    console.log('显示操作菜单');
    wx.showActionSheet({
      itemList: this.data.actions,
      success: (res) => {
        const { tapIndex } = res;
        console.log('选择了操作, 索引:', tapIndex);
        
        if (tapIndex === 0) {
          this.chooseImage();
        } else if (tapIndex === 1) {
          this.takePhoto();
        }
      },
      fail: (err) => {
        console.log('ActionSheet关闭', err);
      }
    });
  },
  
  // 从相册选择照片
  chooseImage() {
    console.log('执行从相册选择照片');
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      camera: 'front',
      success: (res) => {
        const imagePath = res.tempFiles[0].tempFilePath;
        console.log('选择图片成功:', imagePath);
        // 直接进入下一步，不再预览确认
        this.goToEditPage(imagePath);
      },
      fail: (err) => {
        console.error('选择图片失败', err);
        Toast({
          context: this,
          selector: '#t-toast',
          message: '选择图片失败，请重试',
          theme: 'error',
        });
      }
    });
  },

  // 拍摄新照片
  takePhoto() {
    console.log('执行拍摄新照片');
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      camera: 'front', // 使用前置摄像头
      success: (res) => {
        const imagePath = res.tempFiles[0].tempFilePath;
        console.log('拍摄照片成功:', imagePath);
        // 直接进入下一步，不再预览确认
        this.goToEditPage(imagePath);
      },
      fail: (err) => {
        console.error('拍照失败', err);
        Toast({
          context: this,
          selector: '#t-toast',
          message: '拍照失败，请重试',
          theme: 'error',
        });
      }
    });
  },

  // 直接进入编辑页面
  goToEditPage(imagePath) {
    if (!imagePath) {
      Toast({
        context: this,
        selector: '#t-toast',
        message: '图片选择失败，请重试',
        theme: 'error',
      });
      return;
    }

    // 显示加载提示
    wx.showLoading({
      title: '处理中...',
    });

    // 保存临时图片路径到全局数据
    getApp().globalData = getApp().globalData || {};
    getApp().globalData.tempImagePath = imagePath;
    getApp().globalData.sizeType = this.data.sizeType;
    
    // 延迟一小段时间后跳转，以便显示加载提示
    setTimeout(() => {
      wx.hideLoading();
      // 跳转到编辑页面
      wx.navigateTo({
        url: `/pages/edit/edit?size=${this.data.sizeType}`
      });
    }, 500);
  }
}) 