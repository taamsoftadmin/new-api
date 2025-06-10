import React, { useContext, useEffect, useState } from 'react';
import { Button, Typography, Tag } from '@douyinfe/semi-ui';
import { API, showError, isMobile } from '../../helpers';
import { StatusContext } from '../../context/Status';
import { marked } from 'marked';
import { useTranslation } from 'react-i18next';
import { IconGithubLogo, IconPlay, IconFile } from '@douyinfe/semi-icons';
import { Link } from 'react-router-dom';
import NoticeModal from '../../components/layout/NoticeModal';
import { Moonshot, OpenAI, XAI, Zhipu, Volcengine, Cohere, Claude, Gemini, Suno, Minimax, Wenxin, Spark, Qingyan, DeepSeek, Qwen, Midjourney, Grok, AzureAI, Hunyuan, Xinference } from '@lobehub/icons';

const { Text } = Typography;

const Home = () => {
  const { t, i18n } = useTranslation();
  const [statusState] = useContext(StatusContext);
  const [homePageContentLoaded, setHomePageContentLoaded] = useState(false);
  const [homePageContent, setHomePageContent] = useState('');
  const [noticeVisible, setNoticeVisible] = useState(false);

  const isDemoSiteMode = statusState?.status?.demo_site_enabled || false;
  const docsLink = statusState?.status?.docs_link || '';

  useEffect(() => {
    const checkNoticeAndShow = async () => {
      const lastCloseDate = localStorage.getItem('notice_close_date');
      const today = new Date().toDateString();
      if (lastCloseDate !== today) {
        try {
          const res = await API.get('/api/notice');
          const { success, data } = res.data;
          if (success && data && data.trim() !== '') {
            setNoticeVisible(true);
          }
        } catch (error) {
          console.error('获取公告失败:', error);
        }
      }
    };

    checkNoticeAndShow();
  }, []);

  const displayHomePageContent = async () => {
    setHomePageContent(localStorage.getItem('home_page_content') || '');
    const res = await API.get('/api/home_page_content');
    const { success, message, data } = res.data;
    if (success) {
      let content = data;
      if (!data.startsWith('https://')) {
        content = marked.parse(data);
      }
      setHomePageContent(content);
      localStorage.setItem('home_page_content', content);

      // 如果内容是 URL，则发送主题模式
      if (data.startsWith('https://')) {
        const iframe = document.querySelector('iframe');
        if (iframe) {
          const theme = localStorage.getItem('theme-mode') || 'light';
          iframe.onload = () => {
            iframe.contentWindow.postMessage({ themeMode: theme }, '*');
            iframe.contentWindow.postMessage({ lang: i18n.language }, '*');
          };
        }
      }
    } else {
      showError(message);
      setHomePageContent('加载首页内容失败...');
    }
    setHomePageContentLoaded(true);
  };

  useEffect(() => {
    displayHomePageContent().then();
  }, []);

  return (
    <div className="w-full overflow-x-hidden">
      <NoticeModal
        visible={noticeVisible}
        onClose={() => setNoticeVisible(false)}
        isMobile={isMobile()}
      />
      {homePageContentLoaded && homePageContent === '' ? (
        <div className="w-full overflow-x-hidden">
          {/* Banner 部分 */}
          <div className="w-full border-b border-semi-color-border min-h-[500px] md:min-h-[600px] lg:min-h-[700px] relative overflow-x-hidden">
            <div className="flex items-center justify-center h-full px-4 py-20 md:py-24 lg:py-32">
              {/* 居中内容区 */}
              <div className="flex flex-col items-center justify-center text-center max-w-4xl mx-auto">
                <div className="flex flex-col items-center justify-center mb-6 md:mb-8">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-semibold text-semi-color-text-0 leading-tight">
                    {i18n.language === 'en' ? (
                      <>
                        The Unified<br />
                        LLMs API Gateway
                      </>
                    ) : (
                      t('统一的大模型接口网关')
                    )}
                  </h1>
                  <p className="text-lg md:text-xl lg:text-2xl text-semi-color-text-1 mt-4 md:mt-6">
                    {t('更好的价格，更好的稳定性，无需订阅')}
                  </p>
                </div>

                {/* 操作按钮 */}
                <div className="flex flex-row gap-4 justify-center items-center">
                  <Link to="/console">
                    <Button theme="solid" type="primary" size={isMobile() ? "default" : "large"} className="!rounded-3xl px-8 py-2" icon={<IconPlay />}>
                      {t('开始使用')}
                    </Button>
                  </Link>
                  {isDemoSiteMode && statusState?.status?.version ? (
                    <Button
                      size={isMobile() ? "default" : "large"}
                      className="flex items-center !rounded-3xl px-6 py-2"
                      icon={<IconGithubLogo />}
                      onClick={() => window.open('https://github.com/QuantumNous/new-api', '_blank')}
                    >
                      {statusState.status.version}
                    </Button>
                  ) : (
                    docsLink && (
                      <Button
                        size={isMobile() ? "default" : "large"}
                        className="flex items-center !rounded-3xl px-6 py-2"
                        icon={<IconFile />}
                        onClick={() => window.open(docsLink, '_blank')}
                      >
                        {t('文档')}
                      </Button>
                    )
                  )}
                </div>

                {/* 框架兼容性图标 */}
                <div className="mt-12 md:mt-16 lg:mt-20 w-full">
                  <div className="flex items-center mb-6 md:mb-8 justify-center">
                    <Text type="tertiary" className="text-lg md:text-xl lg:text-2xl font-light">
                      {t('支持众多的大模型供应商')}
                    </Text>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 md:gap-6 lg:gap-8 max-w-5xl mx-auto px-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center">
                      <Moonshot size={40} />
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center">
                      <OpenAI size={40} />
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center">
                      <XAI size={40} />
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center">
                      <Zhipu.Color size={40} />
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center">
                      <Volcengine.Color size={40} />
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center">
                      <Cohere.Color size={40} />
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center">
                      <Claude.Color size={40} />
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center">
                      <Gemini.Color size={40} />
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center">
                      <Suno size={40} />
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center">
                      <Minimax.Color size={40} />
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center">
                      <Wenxin.Color size={40} />
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center">
                      <Spark.Color size={40} />
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center">
                      <Qingyan.Color size={40} />
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center">
                      <DeepSeek.Color size={40} />
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center">
                      <Qwen.Color size={40} />
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center">
                      <Midjourney size={40} />
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center">
                      <Grok size={40} />
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center">
                      <AzureAI.Color size={40} />
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center">
                      <Hunyuan.Color size={40} />
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center">
                      <Xinference.Color size={40} />
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center">
                      <Typography.Text className="!text-lg sm:!text-xl md:!text-2xl lg:!text-3xl font-bold">30+</Typography.Text>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-hidden w-full">
          {homePageContent.startsWith('https://') ? (
            <iframe
              src={homePageContent}
              className="w-full h-screen border-none"
            />
          ) : (
            <div
              className="text-base md:text-lg p-4 md:p-6 lg:p-8 overflow-x-hidden max-w-6xl mx-auto"
              dangerouslySetInnerHTML={{ __html: homePageContent }}
            ></div>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;

