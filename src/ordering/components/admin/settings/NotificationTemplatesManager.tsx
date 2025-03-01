import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { toast } from 'react-hot-toast';
import { Save, RefreshCw, AlertCircle, Plus, Trash2 } from 'lucide-react';

interface NotificationTemplate {
  id: number;
  notification_type: string;
  channel: string;
  subject?: string;
  content: string;
  sender_name?: string;
  restaurant_id: number | null;
  frontend_id?: string | null;
  active: boolean;
}

interface NotificationTemplatesManagerProps {
  restaurantId?: string;
}

// Map of notification types to human-readable names
const notificationTypeLabels: Record<string, string> = {
  'order_confirmation': 'Order Confirmation',
  'order_preparing': 'Order Preparing',
  'order_ready': 'Order Ready for Pickup',
  'reservation_confirmation': 'Reservation Confirmation',
  'phone_verification': 'Phone Verification',
};

// Map of channels to human-readable names
const channelLabels: Record<string, string> = {
  'email': 'Email',
  'sms': 'SMS Text Message',
  'whatsapp': 'WhatsApp',
};

// Helper interface for template variables
interface TemplateVariable {
  key: string;
  label: string;
}

export function NotificationTemplatesManager({ restaurantId }: NotificationTemplatesManagerProps) {
  // Helper functions for structured editor
  const extractGreeting = (content: string): string => {
    // Extract greeting from HTML or text content
    const greetingRegex = /<h2[^>]*>(.*?)<\/h2>|Thank you for your (.*?)!/i;
    const match = content.match(greetingRegex);
    return match ? (match[1] || match[2] || 'Thank you for your order!') : 'Thank you for your order!';
  };
  
  const extractMainMessage = (content: string): string => {
    // Extract main message from HTML or text content
    const messageRegex = /<p>Your (.*?)<\/p>|Your (.*?)(?=\.|$)/i;
    const match = content.match(messageRegex);
    return match ? (match[1] || match[2] || '') : '';
  };
  
  const extractClosingMessage = (content: string): string => {
    // Extract closing message from HTML or text content
    const closingRegex = /<p>We will (.*?)<\/p>|We will (.*?)(?=\.|$)/i;
    const match = content.match(closingRegex);
    return match ? (match[1] || match[2] || '') : '';
  };
  
  const updateTemplateSection = (section: string, value: string) => {
    let newContent = editedContent;
    
    switch (section) {
      case 'greeting':
        if (selectedChannel === 'email') {
          // Update HTML greeting
          newContent = newContent.replace(
            /<h2[^>]*>.*?<\/h2>/i,
            `<h2 style="color: {{ brand_color }};">${value}</h2>`
          );
        } else {
          // Update text greeting
          newContent = newContent.replace(
            /^.*?!/,
            `${value}!`
          );
        }
        break;
        
      case 'mainMessage':
        if (selectedChannel === 'email') {
          // Update HTML main message
          if (newContent.includes('<p>Your')) {
            newContent = newContent.replace(
              /<p>Your .*?<\/p>/i,
              `<p>Your ${value}</p>`
            );
          } else {
            // Insert after greeting
            newContent = newContent.replace(
              /<\/h2>/i,
              `</h2><p>Hello {{ customer_name }},</p><p>Your ${value}</p>`
            );
          }
        } else {
          // Update text main message
          if (newContent.includes('Your')) {
            newContent = newContent.replace(
              /Your .*?(?=\.|$)/i,
              `Your ${value}`
            );
          } else {
            // Append to greeting
            newContent = newContent.replace(
              /^.*?!/,
              `$&\nYour ${value}`
            );
          }
        }
        break;
        
      case 'closingMessage':
        if (selectedChannel === 'email') {
          // Update HTML closing message
          if (newContent.includes('<p>We will')) {
            newContent = newContent.replace(
              /<p>We will .*?<\/p>/i,
              `<p>We will ${value}</p>`
            );
          } else {
            // Add before footer or at the end
            const footerPos = newContent.indexOf('{{ footer_text }}');
            if (footerPos > -1) {
              newContent = newContent.slice(0, footerPos) + 
                `<p>We will ${value}</p>\n` + 
                newContent.slice(footerPos);
            } else {
              newContent = newContent.replace(
                /<\/div>$/i,
                `<p>We will ${value}</p></div>`
              );
            }
          }
        } else {
          // Update text closing message
          if (newContent.includes('We will')) {
            newContent = newContent.replace(
              /We will .*?(?=\.|$)/i,
              `We will ${value}`
            );
          } else {
            // Add at the end
            newContent += `\nWe will ${value}`;
          }
        }
        break;
    }
    
    setEditedContent(newContent);
  };
  
  const toggleDetailsSection = (include: boolean) => {
    let newContent = editedContent;
    
    if (include) {
      // Add details section if it doesn't exist
      if (!newContent.includes('Details')) {
        if (selectedChannel === 'email') {
          // For email, add HTML details section
          const insertPos = newContent.indexOf('<p>We will');
          if (insertPos > -1) {
            newContent = newContent.slice(0, insertPos) + 
              '<p><strong>Order Details:</strong></p>\n' +
              '<p>{{ items }}</p>\n' +
              '<p><strong>Total:</strong> ${{ total }}</p>\n' + 
              newContent.slice(insertPos);
          } else {
            // Add before closing div
            newContent = newContent.replace(
              /<\/div>$/i,
              '<p><strong>Order Details:</strong></p>\n' +
              '<p>{{ items }}</p>\n' +
              '<p><strong>Total:</strong> ${{ total }}</p>\n' +
              '</div>'
            );
          }
        } else {
          // For SMS, add text details
          newContent += '\nOrder Details: {{ items }}\nTotal: ${{ total }}';
        }
      }
    } else {
      // Remove details section if it exists
      if (selectedChannel === 'email') {
        // Remove HTML details section
        newContent = newContent.replace(
          /<p><strong>Order Details:<\/strong><\/p>[\s\S]*?<p><strong>Total:<\/strong>.*?<\/p>\n?/i,
          ''
        );
      } else {
        // Remove text details section
        newContent = newContent.replace(
          /\nOrder Details:.*?\nTotal:.*?(?=\n|$)/i,
          ''
        );
      }
    }
    
    setEditedContent(newContent);
  };
  
  const getCommonVariables = (): TemplateVariable[] => {
    // Return variables based on notification type
    const commonVars: TemplateVariable[] = [
      { key: 'customer_name', label: 'Customer Name' },
      { key: 'restaurant_name', label: 'Restaurant Name' }
    ];
    
    if (selectedType.includes('order')) {
      return [
        ...commonVars,
        { key: 'order_id', label: 'Order Number' },
        { key: 'items', label: 'Order Items' },
        { key: 'total', label: 'Order Total' },
        { key: 'eta', label: 'Pickup Time' }
      ];
    } else if (selectedType.includes('reservation')) {
      return [
        ...commonVars,
        { key: 'reservation_id', label: 'Reservation ID' },
        { key: 'reservation_date', label: 'Date' },
        { key: 'reservation_time', label: 'Time' },
        { key: 'party_size', label: 'Party Size' }
      ];
    } else {
      return commonVars;
    }
  };
  
  const toggleVariable = (variable: string, include: boolean) => {
    let newContent = editedContent;
    const varPattern = `{{ ${variable} }}`;
    
    if (include && !newContent.includes(varPattern)) {
      // Add variable based on its type
      switch (variable) {
        case 'customer_name':
          // Add to greeting
          if (selectedChannel === 'email') {
            if (newContent.includes('<p>Hello')) {
              newContent = newContent.replace(
                /<p>Hello .*?<\/p>/i,
                `<p>Hello {{ customer_name }},</p>`
              );
            } else {
              // Add after greeting
              newContent = newContent.replace(
                /<\/h2>/i,
                `</h2><p>Hello {{ customer_name }},</p>`
              );
            }
          } else {
            // For SMS
            newContent = newContent.replace(
              /^(.*?!)/i,
              `$1 Hello {{ customer_name }},`
            );
          }
          break;
          
        case 'order_id':
          // Add to main message
          if (newContent.includes('order')) {
            if (selectedChannel === 'email') {
              newContent = newContent.replace(
                /order(?!\s*#)/i,
                `order #{{ order_id }}`
              );
            } else {
              newContent = newContent.replace(
                /order(?!\s*#)/i,
                `order #{{ order_id }}`
              );
            }
          }
          break;
          
        // Add other variable cases as needed
        
        default:
          // For other variables, just append to appropriate section
          if (!newContent.includes(varPattern)) {
            if (selectedChannel === 'email') {
              // Add before closing div
              newContent = newContent.replace(
                /<\/div>$/i,
                `<p>${varPattern}</p></div>`
              );
            } else {
              // Add at the end for SMS
              newContent += `\n${varPattern}`;
            }
          }
      }
    } else if (!include && newContent.includes(varPattern)) {
      // Remove variable
      newContent = newContent.replace(new RegExp(varPattern, 'g'), '');
      
      // Clean up any empty paragraphs
      if (selectedChannel === 'email') {
        newContent = newContent.replace(/<p>\s*<\/p>/g, '');
      }
    }
    
    setEditedContent(newContent);
  };
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('order_confirmation');
  const [selectedChannel, setSelectedChannel] = useState<string>('email');
  const [currentTemplate, setCurrentTemplate] = useState<NotificationTemplate | null>(null);
  const [editedContent, setEditedContent] = useState<string>('');
  const [editedSubject, setEditedSubject] = useState<string>('');
  const [editedSenderName, setEditedSenderName] = useState<string>('');
  const [previewMode, setPreviewMode] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplateType, setNewTemplateType] = useState<string>('order_confirmation');
  const [newTemplateChannel, setNewTemplateChannel] = useState<string>('email');
  const [previewData, setPreviewData] = useState<Record<string, string>>({
    customer_name: 'John Doe',
    restaurant_name: 'Hafaloha',
    restaurant_address: '123 Beach St, Honolulu, HI',
    restaurant_phone: '(808) 555-1234',
    order_id: '12345',
    total: '45.99',
    items: '1x Aloha Poke, 2x Spam Musubi',
    contact_phone: '(808) 123-4567',
    reservation_id: '5678',
    reservation_date: 'March 15, 2025',
    reservation_time: '7:30 PM',
    party_size: '4',
    code: '123456',
    eta: '5:45 PM',
    brand_color: '#c1902f',
    logo_url: 'https://hafaloha.com/logo.png',
    footer_text: 'Mahalo for your order!',
  });

  // Fetch templates on component mount
  useEffect(() => {
    fetchTemplates();
  }, [restaurantId]);

  // Update current template when selection changes
  useEffect(() => {
    const template = templates.find(
      t => t.notification_type === selectedType && 
           t.channel === selectedChannel
    );
    
    if (template) {
      setCurrentTemplate(template);
      setEditedContent(template.content);
      setEditedSubject(template.subject || '');
      setEditedSenderName(template.sender_name || '');
    } else {
      setCurrentTemplate(null);
      setEditedContent('');
      setEditedSubject('');
      setEditedSenderName('');
    }
  }, [templates, selectedType, selectedChannel]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await api.get<NotificationTemplate[]>('/admin/notification_templates', {
        params: { 
          restaurant_id: restaurantId,
          include_defaults: 'true'
        }
      });
      
      console.log('Templates response:', response);
      
      // Create default templates if none exists
      if (!response || response.length === 0) {
        // This is just for demonstration - in a real app, you'd create templates on the server
        const defaultTemplates: NotificationTemplate[] = [
          {
            id: 0,
            notification_type: 'order_confirmation',
            channel: 'email',
            subject: 'Your order #{{ order_id }} has been confirmed',
            content: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' +
              '<h2 style="color: {{ brand_color }};">Thank you for your order!</h2>' +
              '<p>Hello {{ customer_name }},</p>' +
              '<p>Your order #{{ order_id }} has been confirmed and is being prepared.</p>' +
              '<p><strong>Order Details:</strong></p>' +
              '<p>{{ items }}</p>' +
              '<p><strong>Total:</strong> ${{ total }}</p>' +
              '<p>We will notify you when your order is ready for pickup.</p>' +
              '<p>{{ footer_text }}</p>' +
            '</div>',
            sender_name: 'Hafaloha',
            restaurant_id: null,
            frontend_id: 'hafaloha',
            active: true
          },
          {
            id: 1,
            notification_type: 'order_confirmation',
            channel: 'sms',
            content: "Thank you for your order #{{ order_id }} from {{ restaurant_name }}! Your total is ${{ total }}. We will notify you when it is ready for pickup.",
            sender_name: 'Hafaloha',
            restaurant_id: null,
            frontend_id: 'hafaloha',
            active: true
          },
          {
            id: 2,
            notification_type: 'reservation_confirmation',
            channel: 'email',
            subject: 'Your reservation at {{ restaurant_name }} is confirmed',
            content: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' +
              '<h2 style="color: {{ brand_color }};">Reservation Confirmed!</h2>' +
              '<p>Hello {{ customer_name }},</p>' +
              '<p>Your reservation at {{ restaurant_name }} has been confirmed.</p>' +
              '<p><strong>Details:</strong></p>' +
              '<p>Date: {{ reservation_date }}</p>' +
              '<p>Time: {{ reservation_time }}</p>' +
              '<p>Party Size: {{ party_size }}</p>' +
              '<p>We look forward to serving you!</p>' +
            '</div>',
            sender_name: 'Hafaloha',
            restaurant_id: null,
            frontend_id: 'hafaloha',
            active: true
          }
        ];
        
        setTemplates(defaultTemplates);
      } else {
        setTemplates(response);
      }
    } catch (error) {
      console.error('Failed to fetch notification templates:', error);
      toast.error('Failed to load notification templates');
      
      // Create default templates even on error for demo purposes
      const defaultTemplates: NotificationTemplate[] = [
        {
          id: 0,
          notification_type: 'order_confirmation',
          channel: 'email',
          subject: 'Your order #{{ order_id }} has been confirmed',
          content: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' +
            '<h2 style="color: {{ brand_color }};">Thank you for your order!</h2>' +
            '<p>Hello {{ customer_name }},</p>' +
            '<p>Your order #{{ order_id }} has been confirmed and is being prepared.</p>' +
            '<p><strong>Order Details:</strong></p>' +
            '<p>{{ items }}</p>' +
            '<p><strong>Total:</strong> ${{ total }}</p>' +
            '<p>We will notify you when your order is ready for pickup.</p>' +
            '<p>{{ footer_text }}</p>' +
          '</div>',
          sender_name: 'Hafaloha',
          restaurant_id: null,
          frontend_id: 'hafaloha',
          active: true
        },
        {
          id: 1,
          notification_type: 'order_confirmation',
          channel: 'sms',
          content: "Thank you for your order #{{ order_id }} from {{ restaurant_name }}! Your total is ${{ total }}. We will notify you when it is ready for pickup.",
          sender_name: 'Hafaloha',
          restaurant_id: null,
          frontend_id: 'hafaloha',
          active: true
        },
        {
          id: 2,
          notification_type: 'reservation_confirmation',
          channel: 'email',
          subject: 'Your reservation at {{ restaurant_name }} is confirmed',
          content: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' +
            '<h2 style="color: {{ brand_color }};">Reservation Confirmed!</h2>' +
            '<p>Hello {{ customer_name }},</p>' +
            '<p>Your reservation at {{ restaurant_name }} has been confirmed.</p>' +
            '<p><strong>Details:</strong></p>' +
            '<p>Date: {{ reservation_date }}</p>' +
            '<p>Time: {{ reservation_time }}</p>' +
            '<p>Party Size: {{ party_size }}</p>' +
            '<p>We look forward to serving you!</p>' +
          '</div>',
          sender_name: 'Hafaloha',
          restaurant_id: null,
          frontend_id: 'hafaloha',
          active: true
        }
      ];
      
      setTemplates(defaultTemplates);
    } finally {
      setLoading(false);
    }
  };

  const createNewTemplate = async () => {
    setSaving(true);
    try {
      // First check if a template with this type and channel already exists
      const existingTemplate = templates.find(
        t => t.notification_type === newTemplateType && 
             t.channel === newTemplateChannel &&
             t.restaurant_id !== null // Only check restaurant-specific templates
      );
      
      if (existingTemplate) {
        toast.error('A template with this type and channel already exists');
        setSaving(false);
        return;
      }
      
      // Clone from default template
      const response = await api.post('/admin/notification_templates', {
        clone_from_default: true,
        notification_type: newTemplateType,
        channel: newTemplateChannel
      });
      
      if (response) {
        toast.success('Template created successfully');
        await fetchTemplates();
        setShowCreateModal(false);
        
        // Select the newly created template
        setSelectedType(newTemplateType);
        setSelectedChannel(newTemplateChannel);
      }
    } catch (error) {
      console.error('Failed to create template:', error);
      toast.error('Failed to create template');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async () => {
    if (!currentTemplate || !currentTemplate.id) return;
    
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }
    
    setSaving(true);
    try {
      await api.delete(`/admin/notification_templates/${currentTemplate.id}`);
      toast.success('Template deleted successfully');
      await fetchTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    } finally {
      setSaving(false);
    }
  };

  const saveTemplate = async () => {
    if (!currentTemplate) return;
    
    setSaving(true);
    try {
      const payload = {
        content: editedContent,
        subject: editedSubject || undefined,
        sender_name: editedSenderName || undefined
      };
      
      await api.patch(`/admin/notification_templates/${currentTemplate.id}`, {
        notification_template: payload
      });
      
      // Update local state
      setTemplates(templates.map(t => 
        t.id === currentTemplate.id 
          ? { ...t, ...payload } 
          : t
      ));
      
      toast.success('Template saved successfully');
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = async () => {
    if (!currentTemplate) return;
    
    setSaving(true);
    try {
      await api.post(`/admin/notification_templates/${currentTemplate.id}/reset`);
      await fetchTemplates(); // Refresh templates
      toast.success('Template reset to default');
    } catch (error) {
      console.error('Failed to reset template:', error);
      toast.error('Failed to reset template');
    } finally {
      setSaving(false);
    }
  };

  // Simple template preview renderer
  const renderPreview = (content: string) => {
    let rendered = content;
    
    // Replace variables
    Object.entries(previewData).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, value);
    });
    
    // Handle conditional blocks
    const conditionalRegex = /{%\s*if\s+(\w+)\s*%}(.*?){%\s*endif\s*%}/gs;
    rendered = rendered.replace(conditionalRegex, (match, variable, content) => {
      return previewData[variable] ? content : '';
    });
    
    return rendered;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c1902f]"></div>
      </div>
    );
  }

  // Create Template Modal
  const CreateTemplateModal = () => (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${showCreateModal ? 'block' : 'hidden'}`}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Template</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notification Type
            </label>
            <select
              value={newTemplateType}
              onChange={(e) => setNewTemplateType(e.target.value)}
              className="w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
            >
              {Object.entries(notificationTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Channel
            </label>
            <select
              value={newTemplateChannel}
              onChange={(e) => setNewTemplateChannel(e.target.value)}
              className="w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
            >
              {Object.entries(channelLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => setShowCreateModal(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={createNewTemplate}
            disabled={saving}
            className="px-4 py-2 bg-[#c1902f] text-white rounded-md text-sm font-medium hover:bg-[#d4a43f]"
          >
            {saving ? 'Creating...' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Create Template Modal */}
      <CreateTemplateModal />
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Notification Templates</h2>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#c1902f] hover:bg-[#d4a43f]"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          New Template
        </button>
      </div>
      
      {/* Template selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notification Type
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
          >
            {Object.entries(notificationTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Channel
          </label>
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
          >
            {Object.entries(channelLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>
      
      {currentTemplate ? (
        <>
          {/* Template editor */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Edit Template
              </h3>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setPreviewMode(!previewMode)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                    previewMode 
                      ? 'bg-[#c1902f] text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {previewMode ? 'Edit Mode' : 'Preview Mode'}
                </button>
                
                <button
                  type="button"
                  onClick={resetToDefault}
                  disabled={saving}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c1902f]"
                >
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  Reset to Default
                </button>
                
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={deleteTemplate}
                    disabled={saving || currentTemplate?.restaurant_id === null}
                    title={currentTemplate?.restaurant_id === null ? "Cannot delete default templates" : "Delete this template"}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Delete
                  </button>
                  
                  <button
                    type="button"
                    onClick={saveTemplate}
                    disabled={saving}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#c1902f] hover:bg-[#d4a43f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c1902f]"
                  >
                    <Save className="h-4 w-4 mr-1.5" />
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
            
            {/* Email-specific fields */}
            {selectedChannel === 'email' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  disabled={previewMode}
                  className="w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
                />
              </div>
            )}
            
            {/* Sender name field */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sender Name
              </label>
              <input
                type="text"
                value={editedSenderName}
                onChange={(e) => setEditedSenderName(e.target.value)}
                disabled={previewMode}
                placeholder="Leave blank to use restaurant name"
                className="w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
              />
            </div>
            
            {/* Structured content editor */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message Content
              </label>
              
              {previewMode ? (
                <div className="border border-gray-300 rounded-md p-4 min-h-[200px] bg-gray-50">
                  {selectedChannel === 'email' ? (
                    <div dangerouslySetInnerHTML={{ __html: renderPreview(editedContent) }} />
                  ) : (
                    <div className="whitespace-pre-wrap text-sm">
                      {renderPreview(editedContent)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 border border-gray-300 rounded-md p-4 bg-white">
                  {/* Order/Reservation greeting */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Greeting
                    </label>
                    <input
                      type="text"
                      value={extractGreeting(editedContent)}
                      onChange={(e) => updateTemplateSection('greeting', e.target.value)}
                      placeholder="Thank you for your order!"
                      className="w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
                    />
                  </div>
                  
                  {/* Main message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Main Message
                    </label>
                    <textarea
                      value={extractMainMessage(editedContent)}
                      onChange={(e) => updateTemplateSection('mainMessage', e.target.value)}
                      rows={3}
                      placeholder="Your order has been confirmed and is being prepared."
                      className="w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
                    />
                  </div>
                  
                  {/* Include order/reservation details */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="includeDetails"
                      checked={editedContent.includes('Details')}
                      onChange={(e) => toggleDetailsSection(e.target.checked)}
                      className="h-4 w-4 text-[#c1902f] focus:ring-[#c1902f] border-gray-300 rounded"
                    />
                    <label htmlFor="includeDetails" className="ml-2 block text-sm text-gray-700">
                      Include order/reservation details
                    </label>
                  </div>
                  
                  {/* Closing message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Closing Message
                    </label>
                    <input
                      type="text"
                      value={extractClosingMessage(editedContent)}
                      onChange={(e) => updateTemplateSection('closingMessage', e.target.value)}
                      placeholder="We will notify you when your order is ready for pickup."
                      className="w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
                    />
                  </div>
                  
                  {/* Include variables section */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Include Variables
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {getCommonVariables().map(variable => (
                        <div key={variable.key} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`var-${variable.key}`}
                            checked={editedContent.includes(`{{ ${variable.key} }}`)}
                            onChange={(e) => toggleVariable(variable.key, e.target.checked)}
                            className="h-4 w-4 text-[#c1902f] focus:ring-[#c1902f] border-gray-300 rounded"
                          />
                          <label htmlFor={`var-${variable.key}`} className="ml-2 block text-sm text-gray-700">
                            {variable.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Template help */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Template Tips
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p className="mb-2">
                    <strong>Preview Mode:</strong> Use the Preview Mode button to see how your template will look with sample data.
                  </p>
                  <p className="mb-2">
                    <strong>Variables:</strong> Check the boxes in the "Include Variables" section to add dynamic content that will be replaced with actual values when sending notifications.
                  </p>
                  <p className="mb-2">
                    <strong>Order/Reservation Details:</strong> Enable the checkbox to include details like items and total in your notifications.
                  </p>
                  <p className="mb-2">
                    <strong>Reset to Default:</strong> If you make a mistake, you can always reset the template to its default version.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No template found for this notification type and channel.</p>
          <button
            onClick={fetchTemplates}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#c1902f] hover:bg-[#d4a43f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c1902f]"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Templates
          </button>
        </div>
      )}
    </div>
  );
}

export default NotificationTemplatesManager;
