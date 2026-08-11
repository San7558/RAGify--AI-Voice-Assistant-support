from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from app.core.config import settings
from app.rag.vectorstore import get_vectorstore
import logging

def get_llm():
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set")
    return ChatGroq(
        temperature=0.0,
        model_name=settings.GROQ_MODEL,
        groq_api_key=settings.GROQ_API_KEY
    )

def get_qa_chain(user_id: str, document_id: str):
    llm = get_llm()
    # Fix 1: pass document_id so vectorstore uses the correct namespace.
    # Namespace is now the primary isolation boundary; the metadata filter
    # (user_id) is kept as defence-in-depth only.
    vectorstore = get_vectorstore(document_id)

    retriever = vectorstore.as_retriever(
        search_kwargs={
            "k": 4,
            # Defence-in-depth: only return chunks that also carry this user_id
            "filter": {"user_id": user_id},
        }
    )
    
    # Prompt
    system_prompt = (
        "You are RAGify, a helpful document question-answering assistant. "
        "Answer the user's question using only the supplied document context. "
        "Write the answer in a natural, clear, and conversational way. "
        "Rules:\n"
        "- Use complete sentences.\n"
        "- Be concise but helpful.\n"
        "- Do not return only a raw keyword, name, email address, location, date, or number when a natural sentence can be formed.\n"
        "- Preserve exact factual values such as names, email addresses, phone numbers, URLs, dates, technical skills, and locations.\n"
        "- Do not invent information.\n"
        "- Do not use outside knowledge.\n"
        "- Do not mention the retrieval process, chunks, embeddings, or Pinecone.\n"
        "- If the answer is not present, respond exactly: \"I could not find this information in the provided source.\"\n\n"
        "Context:\n{context}"
    )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
    ])
    
    question_answer_chain = create_stuff_documents_chain(llm, prompt)
    rag_chain = create_retrieval_chain(retriever, question_answer_chain)
    
    return rag_chain
