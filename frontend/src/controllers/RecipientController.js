// ## Recipient Controller
// ## Handles recipient user interactions and coordinates between Model and View
import { RequestModel } from '../models/RequestModel';
import { useAuth } from '../hooks/useAuth';

// ## Recipient Controller Class
// ## Manages recipient dashboard data flow and user interactions
export class RecipientController {
  // ## Get recipient request statistics
  static getRequestStats(recipientId = null) {
    return RequestModel.calculateRequestStats(recipientId);
  }

  // ## Get all recipient requests
  static getAllRequests(recipientId = null) {
    if (recipientId) {
      return RequestModel.getRequestsByRecipient(recipientId);
    }
    return RequestModel.getAllRequests();
  }

  // ## Get requests by status
  static getRequestsByStatus(status, recipientId = null) {
    const requests = recipientId 
      ? RequestModel.getRequestsByRecipient(recipientId)
      : RequestModel.getAllRequests();
    return requests.filter(r => r.status === status);
  }

  // ## Handle create request action
  static handleCreateRequest(navigate) {
    navigate('/dashboard/request');
  }

  // ## Submit new request
  static submitRequest(requestData) {
    return RequestModel.createRequest(requestData);
  }
}
