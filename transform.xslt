
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:strip-space elements="*"/>

    <xsl:template match="/">
        <div id="legislation">
            <xsl:apply-templates select="act"/>
        </div>
    </xsl:template>

    <xsl:template match="act">
        <div class="act">
             <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>    
              <xsl:apply-templates select="cover"/>       
               <xsl:apply-templates select="front"/> 
             <xsl:apply-templates select="body"/>       
        </div>
    </xsl:template>

    <xsl:template match="cover">
        <div class="cover reprint">
        <!--<p class="reprint-date">
            Reprint as at <xsl:value-of select="reprint-date"/>
        </p>-->
        <h1 class="title"><xsl:value-of select="title"/></h1>
        </div>
    </xsl:template>

    <xsl:template match="contents">
    </xsl:template>

    <xsl:template match="front">
        <div class="front">
            <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>   
            <div class="long-title">
                 <xsl:value-of select="long-title/para/text"/>
            
             <xsl:apply-templates select="long-title/para/label-para"/> 
             </div>           
        </div>
    </xsl:template>

    <xsl:template match="body">
        <div class="body">
            <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>   
             <xsl:apply-templates select="part"/>         
        </div>
    </xsl:template>

    <xsl:template match="part">
        <div class="part">
             <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute> 
            <h2 class="part">
                <span class="label">Part <xsl:value-of select="label"/></span><br/>
                <xsl:value-of select="heading"/>
            </h2>
            <xsl:apply-templates select="prov"/> 
        </div>
    </xsl:template>


    <xsl:template match="prov">
        <div class="prov">
            <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
            <h5 class="prov labelled">
                <span class="label">
                    <xsl:value-of select="label"/>
                </span>
                <xsl:value-of select="heading"/>
            </h5>
            <ul class="prov">
                <li>
                    <xsl:apply-templates select="prov.body/subprov"/>
                    <xsl:apply-templates select="notes/history/history-note"/>
                </li>
            </ul>
        </div>
    </xsl:template>

    <xsl:template match='prov.body/subprov'>

        <div class="subprov">
            <xsl:apply-templates select="label"/>
            <xsl:apply-templates select="para/label-para"/>
            <xsl:apply-templates select="para/def-para"/>å
        </div>
       

    </xsl:template>

    <xsl:template match="para/label-para">
        <ul class="label-para">
            <li>
                <xsl:apply-templates select="label"/>
                <xsl:apply-templates select="para/label-para"/>
            </li>
        </ul>
    </xsl:template>

    <xsl:template match="para/def-para">       
        <div class="def-para">
             <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>           
            <p class="text">
                <dfn class="def-term">
                <xsl:attribute name="id">
                        <xsl:value-of select="para/text/def-term/@id"/>
                    </xsl:attribute>
                    <xsl:value-of select="para/text/def-term"/>                        
                </dfn>
                <xsl:value-of select="para/text/text()"/>
                 <xsl:apply-templates select="para/label-para"/>
            </p>
        </div>
    </xsl:template>

    <xsl:template match="label">
        <p class="labelled label">
            <xsl:if test="text() != ''">
                <span class="label">
                    (<xsl:value-of select="."/>)
                </span>
            </xsl:if>
            <xsl:choose>
            <xsl:when test="../para/text != ''">
                <xsl:value-of select="../para/text"/>
            </xsl:when>
            <xsl:otherwise>
                <span class="deleted label-deleted">[Repealed]</span>
            </xsl:otherwise>
        </xsl:choose>
        </p>
    </xsl:template>

    <xsl:template match="notes/history/history-note">
        <p class="history-note">
            <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
            <xsl:value-of select="."/>
        </p>
    </xsl:template>

</xsl:stylesheet>