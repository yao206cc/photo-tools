// 引入TDesign Toast
import Toast from 'tdesign-miniprogram/toast/index';

// 常量定义
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

  /**
   * 页面的初始数据
   */
  data: {
    selectedSize: 'size1',
    sizeInfo: sizeInfo,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 页面加载时的初始化
    this.initializeData();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 每次页面显示时执行
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
    
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    
  },

  initializeData() {
    // 初始化数据，可以从缓存中读取上次选择的size等
    const lastSelectedSize = wx.getStorageSync('lastSelectedSize');
    if (lastSelectedSize && sizeInfo[lastSelectedSize]) {
      this.setData({
        selectedSize: lastSelectedSize
      });
    }
  },

  // 选择照片尺寸
  selectSize(e) {
    const size = e.currentTarget.dataset.size;
    
    if (!sizeInfo[size]) {
      return;
    }
    
    this.setData({
      selectedSize: size
    });
    
    // 保存选择到本地存储
    wx.setStorageSync('lastSelectedSize', size);
    
    // 提示用户已选择
    Toast({
      context: this,
      selector: '#t-toast',
      message: `已选择${sizeInfo[size].name}`,
      direction: 'column',
    });
  },

  // 前往照片导入页面
  goToImport() {
    // 传递选中的尺寸信息
    wx.navigateTo({
      url: `/pages/import/import?size=${this.data.selectedSize}`
    });
  },

  // 显示所有尺寸
  showAllSizes() {
    // 弹窗或页面展示所有支持的尺寸规格
    wx.showToast({
      title: '更多尺寸即将上线',
      icon: 'none'
    });
  }
})